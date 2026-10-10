import fs from "fs";
import path from "path";
import handlebars from 'handlebars';
import QRCode from 'qrcode';
import { DiskStorageProvider } from '../providers/StorageProvider';
import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";
import { PdfProvider } from '../providers/PdfProvider';
import { MailProvider } from '../providers/MailProvider';
import { setFullURL } from "../utils/setFullUrl";

export const createServiceOrder = async (
    data: Omit<Prisma.ServiceOrderUncheckedCreateInput, 'openedById' | 'tenantId' | 'number'>, // Garantimos que o number não venha do payload
    loggedUserId: string,
    tenantId: string
) => {
    // 1. Buscamos o equipamento validando o tenantId
    const equipment = await prisma.equipment.findFirst({
        where: { id: data.equipmentId, tenantId },
        select: { id: true, customerId: true, modelId: true }
    });

    if (!equipment) throw new AppError('Equipamento não consta na base de dados', 404);
    if (equipment.customerId !== data.customerId) throw new AppError('Esse equipamento não pertence a esse cliente', 403);

    // 🟢 2. CÁLCULO DO NÚMERO DA O.S. (Isolado por Tenant)
    const lastOs = await prisma.serviceOrder.findFirst({
        where: { tenantId },
        orderBy: { number: 'desc' },
        select: { number: true }
    });

    // Se a empresa já tem O.S., pega a última e soma 1. Se não, começa da 1.
    const nextNumber = lastOs ? lastOs.number + 1 : 1;

    // 3. A Inteligência do Checklist (filtrando checklistTemplate pelo tenantId)
    let checklistData: Prisma.ServiceOrderChecklistCreateNestedOneWithoutServiceOrderInput | undefined = undefined;

    if (data.type === 'PREVENTIVA' || data.type === 'INSTALACAO') {
        const template = await prisma.checklistTemplate.findFirst({
            where: {
                modelId: equipment.modelId,
                tenantId,
                active: true
            },
            include: {
                questions: { orderBy: { order: 'asc' } }
            }
        });

        if (template && template.questions.length > 0) {
            checklistData = {
                create: {
                    answers: {
                        create: template.questions.map((q: any) => ({
                            question_text: q.text,
                            order: q.order,
                            is_ok: false
                        }))
                    }
                }
            };
        }
    }

    // 4. Montamos as queries para a transação
    const updateEquipmentQuery = prisma.equipment.update({
        where: { id: data.equipmentId, tenantId },
        data: { status: 'REPARO' }
    });

    const createServiceOrderQuery = prisma.serviceOrder.create({
        data: {
            ...data,
            number: nextNumber, // 🟢 Injetamos o número sequencial calculado
            tenantId,
            openedById: loggedUserId,
            checklist: checklistData
        },
        include: {
            equipment: { include: { model: true } },
            customer: true,
            checklist: { include: { answers: true } }
        }
    });

    // 5. Executamos tudo em uma única tacada
    const [_, serviceOrder] = await prisma.$transaction([
        updateEquipmentQuery,
        createServiceOrderQuery
    ]);

    return serviceOrder;
};

export const listAllServiceOrders = async (tenantId: string) => {
    const OSList = await prisma.serviceOrder.findMany({
        where: { tenantId },
        include: {
            equipment: {
                select: {
                    serial_number: true,
                    received_at: true,
                    returned_at: true,
                    status: true,
                    model: {
                        select: { name: true }
                    }
                }
            },
            customer: {
                select: {
                    name: true,
                    email: true,
                    phone: true,
                    city: true,
                    state: true,
                    address: true
                }
            },
            openedBy: { select: { name: true, email: true } },
            closedBy: { select: { name: true, email: true } }
        },
        orderBy: { opened_at: 'asc' },
    });
    return OSList;
};

export const getServiceOrderById = async (id: string, tenantId: string) => {
    const serviceOrder = await prisma.serviceOrder.findFirst({
        where: { id, tenantId },
        include: {
            equipment: {
                select: {
                    serial_number: true,
                    received_at: true,
                    returned_at: true,
                    status: true,
                    model: {
                        select: { name: true }
                    }
                }
            },
            customer: {
                select: {
                    name: true,
                    email: true,
                    phone: true,
                    city: true,
                    state: true,
                    address: true
                }
            },
            openedBy: { select: { name: true, email: true } },
            closedBy: { select: { name: true, email: true } },
            serviceOrderEvents: {
                orderBy: { created_at: 'desc' },
                include: {
                    user: { select: { name: true } }
                }
            },
            checklist: {
                include: {
                    answers: { orderBy: { order: 'asc' } }
                }
            },
            images: { orderBy: { created_at: 'asc' } },
            parts_replaced: {
                select: {
                    id: true,
                    quantity: true,
                    unit_price: true,
                    part: {
                        select: { name: true, sku: true }
                    }
                }
            }
        }
    });

    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    const { serviceOrderEvents, ...osData } = serviceOrder as any;

    return {
        ...osData,
        events: serviceOrderEvents,
        images: osData.images?.map((img: any) => ({
            ...img,
            url: setFullURL(`/uploads/os_images/${img.url}`)
        }))
    };
};

export type UpdateOSData = Prisma.ServiceOrderUncheckedUpdateInput & {
    labor_cost?: number;
    travel_cost?: number;
    accommodation_cost?: number;
    parts?: {
        part_name: string;
        part_code?: string;
        cost?: number;
    }[];
};

export const updateServiceOrder = async (
    id: string,
    tenantId: string,
    payload: UpdateOSData,
    loggedUserId: string
) => {
    const { tenantId: _, ...data } = payload as any;

    const serviceOrder = await prisma.serviceOrder.findFirst({
        where: { id, tenantId },
        include: { checklist: true }
    });

    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    if (data.status === 'FINALIZADA') {
        if (serviceOrder.checklist && !serviceOrder.checklist.completed_at) {
            throw new AppError('Acesso negado. Não é possível finalizar a Ordem de Serviço pois o checklist obrigatório ainda não foi preenchido.', 403);
        }

        if (!data.solution_description) {
            throw new AppError('Para finalizar a O.S., é obrigatório informar a descrição da solução (solution_description).', 400);
        }
    }

    const queries = [];
    let osDataToUpdate = { ...data };

    if (data.status === 'FINALIZADA' || data.status === 'CANCELADA') {
        osDataToUpdate.closed_at = new Date();
        osDataToUpdate.closedById = loggedUserId;

        const equipmentStatus = data.status === 'FINALIZADA' ? 'FINALIZADO' : 'OS_CANCELADA';

        const equipmentUpdateQuery = prisma.equipment.update({
            where: { id: serviceOrder.equipmentId, tenantId },
            data: {
                status: equipmentStatus,
                returned_at: new Date()
            }
        });
        queries.push(equipmentUpdateQuery);
    }

    const updateOSQuery = prisma.serviceOrder.update({
        where: { id, tenantId },
        data: osDataToUpdate
    });
    queries.push(updateOSQuery);

    const result = await prisma.$transaction(queries);
    return result[result.length - 1];
};

export const cancelServiceOrder = async (
    id: string,
    tenantId: string,
    reason: string,
    loggedUserId: string
) => {
    const serviceOrder = await prisma.serviceOrder.findFirst({
        where: { id, tenantId }
    });
    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    const cancelServiceQuery = prisma.serviceOrder.update({
        where: { id, tenantId },
        data: {
            status: 'CANCELADA',
            cancellation_reason: reason,
            closed_at: new Date(),
            closedById: loggedUserId
        }
    });

    const updateEquipmentQuery = prisma.equipment.update({
        where: { id: serviceOrder.equipmentId, tenantId },
        data: { status: 'OS_CANCELADA' }
    });

    await prisma.$transaction([cancelServiceQuery, updateEquipmentQuery]);

    return { message: 'Ordem de serviço cancelada' };
};

export const reopenServiceOrder = async (
    id: string,
    tenantId: string,
    loggedUserId: string,
    reason: string
) => {
    const serviceOrder = await prisma.serviceOrder.findFirst({
        where: { id, tenantId }
    });
    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    if (serviceOrder.status === 'ABERTA') {
        throw new AppError('Esta ordem de serviço já está aberta', 400);
    }

    const reopenServiceQuery = prisma.serviceOrder.update({
        where: { id, tenantId },
        data: {
            status: 'ABERTA',
            closed_at: null,
            closedById: null,
            cancellation_reason: null
        }
    });

    const updateEquipmentQuery = prisma.equipment.update({
        where: { id: serviceOrder.equipmentId, tenantId },
        data: {
            status: 'REPARO',
            returned_at: null
        }
    });

    const eventLogQuery = prisma.serviceOrderEvent.create({
        data: {
            serviceOrderId: id,
            userId: loggedUserId,
            action: 'REABERTURA',
            notes: reason
        }
    });

    await prisma.$transaction([reopenServiceQuery, updateEquipmentQuery, eventLogQuery]);

    return { message: 'Ordem de serviço reaberta com sucesso' };
};

export const updateServiceOrderChecklist = async (
    serviceOrderId: string,
    tenantId: string,
    payload: { notes?: string, answers: { id: string, is_ok: boolean, comment?: string; }[]; }
) => {
    const os = await prisma.serviceOrder.findFirst({
        where: { id: serviceOrderId, tenantId },
        include: { checklist: true }
    });

    if (!os || !os.checklist) {
        throw new AppError('Checklist não encontrado para esta ordem de serviço', 404);
    }

    const queries = [];

    queries.push(prisma.serviceOrderChecklist.update({
        where: { id: os.checklist.id },
        data: {
            notes: payload.notes,
            completed_at: new Date()
        }
    }));

    for (const answer of payload.answers) {
        queries.push(prisma.checklistAnswer.update({
            where: { id: answer.id },
            data: {
                is_ok: answer.is_ok,
                comment: answer.comment
            }
        }));
    }

    await prisma.$transaction(queries);

    return { message: 'Checklist preenchido e salvo com sucesso' };
};

export const addPartToServiceOrder = async (
    osId: string,
    tenantId: string,
    partId: string,
    quantity: number,
    loggedUserId: string
) => {
    const os = await prisma.serviceOrder.findFirst({
        where: { id: osId, tenantId }
    });
    if (!os) throw new AppError("Ordem de Serviço não encontrada.", 404);
    if (os.status !== 'ABERTA') throw new AppError("Não é possível adicionar peças em uma O.S. que não está aberta.", 403);

    const part = await prisma.part.findFirst({
        where: { id: partId, tenantId }
    });
    if (!part) throw new AppError("Peça não encontrada no catálogo.", 404);

    if (part.current_stock < quantity) {
        throw new AppError(`Estoque insuficiente. Saldo atual da peça '${part.name}': ${part.current_stock} un.`, 400);
    }

    const result = await prisma.$transaction([
        prisma.partReplaced.create({
            data: {
                serviceOrderId: osId,
                partId: partId,
                quantity: quantity,
                unit_price: part.sale_price
            }
        }),

        prisma.stockMovement.create({
            data: {
                partId: partId,
                type: "OUT",
                quantity: quantity,
                reason: `Peça aplicada na O.S. ID: ${os.number}`,
                serviceOrderId: osId,
                userId: loggedUserId
            }
        }),

        prisma.part.update({
            where: { id: partId, tenantId },
            data: {
                current_stock: {
                    decrement: quantity
                }
            }
        })
    ]);

    return result[0];
};

export const saveClientSignature = async (
    id: string,
    tenantId: string,
    signatureBase64: string
) => {
    const os = await prisma.serviceOrder.findFirst({
        where: { id, tenantId }
    });

    if (!os) throw new AppError('Ordem de serviço não encontrada.', 404);
    if (os.status !== 'ABERTA') {
        throw new AppError('Não é possível adicionar uma assinatura em uma O.S. finalizada ou cancelada.', 403);
    }

    const updatedOS = await prisma.serviceOrder.update({
        where: { id, tenantId },
        data: { client_signature: signatureBase64 },
        select: { id: true, client_signature: true }
    });

    return updatedOS;
};

// 🟢 FUNÇÃO SUPORTA CHAMADA PÚBLICA (QR CODE) E PRIVADA
export const generateServiceOrderPdf = async (id: string, tenantId?: string) => {
    const os = await prisma.serviceOrder.findFirst({
        where: {
            id,
            ...(tenantId ? { tenantId } : {})
        },
        include: {
            tenant: true, // 🟢 Trazemos a empresa para pegar o nome
            customer: true,
            equipment: { include: { model: true } },
            parts_replaced: { include: { part: true } },
            closedBy: true,
            serviceOrderEvents: {
                orderBy: { created_at: 'asc' },
                include: { user: { select: { name: true } } }
            },
            checklist: {
                include: { answers: { orderBy: { order: 'asc' } } }
            }
        }
    });

    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    if (os.status !== 'FINALIZADA') {
        throw new AppError('Apenas Ordens de Serviço finalizadas podem gerar o relatório PDF.', 400);
    }

    const reopenEvents = os.serviceOrderEvents
        .filter(event => event.action === 'REABERTURA')
        .map(event => ({
            date: new Date(event.created_at).toLocaleDateString('pt-BR') + ' às ' + new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            user: event.user.name,
            reason: event.notes || 'Não informado'
        }));

    let checklistData = null;
    if (os.checklist && os.checklist.answers.length > 0) {
        checklistData = {
            notes: os.checklist.notes,
            answers: os.checklist.answers.map(ans => ({
                question: ans.question_text,
                is_ok: ans.is_ok,
                comment: ans.comment || '-'
            }))
        };
    }

    const partsTotal = os.parts_replaced.reduce((acc: any, curr: any) => {
        return acc + (Number(curr.unit_price) * curr.quantity);
    }, 0);

    const labor = Number(os.labor_cost);
    const travel = Number(os.travel_cost);
    const accommodation = Number(os.accommodation_cost);
    const grandTotal = partsTotal + labor + travel + accommodation;

    const formatCurrency = (val: number) => val.toFixed(2).replace('.', ',');

    const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'logo_dwl.png');
    let logoBase64 = '';

    try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
        // Logo genérica ou erro ignorado. Mais pra frente o Tenant pode ter sua própria logo.
        console.warn('Logo padrão não encontrada na pasta assets.');
    }

    const dateToPrint = os.closed_at ? new Date(os.closed_at) : new Date();
    const formattedClosingDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dateToPrint);

    const templateData = {
        tenant: {
            name: os.tenant?.name || 'Assistência Técnica'
        },
        os: {
            number: os.number,
            type: os.type,
            problem_description: os.problem_description,
            solution_description: os.solution_description,
            technical_notes: os.technical_notes,
            signer_name: os.signer_name,
            isPreventiva: os.type === 'PREVENTIVA'
        },
        year: new Date(os.opened_at).getFullYear(),
        customer: {
            name: os.customer.name,
            address: os.customer.address || 'Não informado',
            city: os.customer.city,
            state: os.customer.state,
            phone: os.customer.phone || 'Não informado'
        },
        equipment: {
            model_name: os.equipment?.model.name,
            serial_number: os.equipment?.serial_number
        },
        parts: os.parts_replaced.map((p: any) => ({
            sku: p.part.sku || 'N/A',
            name: p.part.name,
            quantity: p.quantity,
            unit_price: formatCurrency(Number(p.unit_price)),
            total_price: formatCurrency(Number(p.unit_price) * p.quantity)
        })),
        costs: {
            parts_total: formatCurrency(partsTotal),
            labor: formatCurrency(labor),
            travel: formatCurrency(travel),
            accommodation: formatCurrency(accommodation),
            grand_total: formatCurrency(grandTotal)
        },
        logo_url: logoBase64,
        client_signature: os.client_signature,
        tech: {
            name: os.closedBy?.name || 'Técnico Responsável',
            signature: os.closedBy?.signature_url
        },
        currentDate: formattedClosingDate,
        hasReopenEvents: reopenEvents.length > 0,
        reopenEvents,
        hasChecklist: !!checklistData,
        checklist: checklistData
    };

    const pdfProvider = new PdfProvider();
    const fileName = `OS-${os.number}-${new Date().getTime()}.pdf`;

    await pdfProvider.generatePdf({
        templateName: 'os-report',
        data: templateData,
        fileName
    });

    return setFullURL(`/uploads/os_pdfs/${fileName}`);
};

export const sendServiceOrderEmail = async (id: string, tenantId: string, customEmail?: string) => {
    const os = await prisma.serviceOrder.findFirst({
        where: { id, tenantId },
        include: {
            tenant: true, // 🟢 Trazemos a empresa
            customer: true,
            equipment: { include: { model: true } }
        }
    });

    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    const recipientEmail = customEmail || os.customer.email;

    if (!recipientEmail) {
        throw new AppError('Nenhum e-mail de destino foi informado e o cliente não possui e-mail cadastrado.', 400);
    }

    const pdfRelativeUrl = await generateServiceOrderPdf(id, tenantId);

    const fileName = pdfRelativeUrl.split('/').pop() as string;
    const pdfPhysicalPath = path.resolve(process.cwd(), 'uploads', 'os_pdfs', fileName);

    const templatePath = path.resolve(process.cwd(), 'src', 'templates', 'os-email.hbs');
    const templateFile = fs.readFileSync(templatePath, 'utf-8');
    const compileTemplate = handlebars.compile(templateFile);
    const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'logo_dwl.png');

    const htmlBody = compileTemplate({
        customerName: os.customer.name,
        tenantName: os.tenant.name, // 🟢 Passamos para o template do E-mail
        osNumber: `${os.number}/${new Date(os.opened_at).getFullYear()}`,
        equipmentModel: os.equipment?.model.name || 'Não especificado',
        serialNumber: os.equipment?.serial_number || 'Não especificado'
    });

    const mailProvider = new MailProvider();

    await mailProvider.sendMail({
        to: recipientEmail,
        subject: `${os.tenant.name} - Relatório Técnico da O.S. ${os.number}`, // 🟢 Assunto Dinâmico
        body: htmlBody,
        attachments: [
            {
                filename: `Relatorio_OS_${os.number}.pdf`,
                path: pdfPhysicalPath,
                contentType: 'application/pdf'
            },
            {
                // Se a imagem não existir, o Nodemailer não anexa. Cuidado se apagar o arquivo fisicamente.
                filename: 'logo.png',
                path: logoPath,
                cid: 'logo_dwl'
            }
        ]
    });

    return { message: 'E-mail enviado com sucesso!', recipient: recipientEmail };
};

export const generateNiimbotLabel = async (id: string, tenantId: string) => {
    const os = await prisma.serviceOrder.findFirst({
        where: { id, tenantId },
        include: { equipment: true }
    });

    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3333';
    const osUrl = `${baseUrl}/api/serviceorder/${os.id}/qr-pdf`;

    const qrCodeDataUrl = await QRCode.toDataURL(osUrl, { margin: 1 });

    const closedDate = os.closed_at ? new Date(os.closed_at) : new Date();
    const currentDateStr = closedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const nextDate = new Date(closedDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    const nextDateStr = `${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`;

    let osTypeStr = 'Corretiva';
    if (os.type === 'PREVENTIVA') osTypeStr = 'Preventiva';
    if (os.type === 'INSTALACAO') osTypeStr = 'Instalação';

    const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'logo_dwl.png');
    let logoBase64 = '';
    try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
        console.warn('Logo da empresa não encontrada na pasta assets.');
    }

    const osYear = new Date(os.opened_at).getFullYear();

    const templateData = {
        osNumber: `${os.number}/${osYear}`,
        osType: osTypeStr,
        currentDate: currentDateStr,
        nextDate: os.type === 'PREVENTIVA' ? nextDateStr : '-',
        qrCodeDataUrl,
        logo_url: logoBase64
    };

    const pdfProvider = new PdfProvider();
    const fileName = `ETIQUETA-${os.number}-${new Date().getTime()}.pdf`;

    await pdfProvider.generatePdf({
        templateName: 'label',
        data: templateData,
        fileName,
        width: '50mm',
        height: '30mm',
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    return setFullURL(`/uploads/os_pdfs/${fileName}`);
};

export const addServiceOrderImage = async (
    osId: string,
    tenantId: string,
    tag: 'ANTES' | 'DURANTE' | 'DEPOIS',
    tmpFileName: string
) => {
    const os = await prisma.serviceOrder.findFirst({
        where: { id: osId, tenantId }
    });
    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    const storageProvider = new DiskStorageProvider();
    const finalFileName = `os-${os.number}-${new Date().getTime()}`;

    const savedFileName = await storageProvider.saveFile(tmpFileName, 'os_images', finalFileName);

    const image = await prisma.serviceOrderImage.create({
        data: {
            serviceOrderId: osId,
            tag,
            url: savedFileName
        }
    });

    return {
        ...image,
        url: setFullURL(`/uploads/os_images/${image.url}`)
    };
};

export const removeServiceOrderImage = async (imageId: string, tenantId: string) => {
    const image = await prisma.serviceOrderImage.findFirst({
        where: {
            id: imageId,
            serviceOrder: {
                tenantId
            }
        }
    });
    if (!image) throw new AppError('Imagem não encontrada', 404);

    const storageProvider = new DiskStorageProvider();
    await storageProvider.deleteFile(image.url, 'os_images');

    await prisma.serviceOrderImage.delete({ where: { id: imageId } });

    return { message: 'Imagem removida com sucesso' };
};