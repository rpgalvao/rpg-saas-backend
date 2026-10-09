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

export const createServiceOrder = async (data: Omit<Prisma.ServiceOrderUncheckedCreateInput, 'openedById'>, loggedUserId: string) => {
    // 1. Buscamos o equipamento (agora precisamos do modelId para o checklist)
    const equipment = await prisma.equipment.findUnique({
        where: { id: data.equipmentId },
        select: { id: true, customerId: true, modelId: true } // Pegamos o modelId!
    });

    if (!equipment) throw new AppError('Equipamento não consta na base de dados', 404);
    if (equipment.customerId !== data.customerId) throw new AppError('Esse equipamento não pertence a esse cliente', 403);

    // 2. A Inteligência do Checklist
    // Preparamos o objeto que vai criar a folha de respostas, se necessário
    let checklistData: Prisma.ServiceOrderChecklistCreateNestedOneWithoutServiceOrderInput | undefined = undefined;

    // Só geramos checklist se for Preventiva ou Instalação
    if (data.type === 'PREVENTIVA' || data.type === 'INSTALACAO') {
        const template = await prisma.checklistTemplate.findFirst({
            where: {
                modelId: equipment.modelId,
                active: true // Só pega se o gabarito estiver ativo
            },
            include: {
                questions: { orderBy: { order: 'asc' } }
            }
        });

        // Se encontrou um gabarito com perguntas, montamos o "copy-paste"
        if (template && template.questions.length > 0) {
            checklistData = {
                create: {
                    answers: {
                        create: template.questions.map((q: any) => ({
                            question_text: q.text,
                            order: q.order,
                            is_ok: false // Valor padrão inicial
                        }))
                    }
                }
            };
        }
    }

    // 3. Montamos as queries para a transação
    const updateEquipmentQuery = prisma.equipment.update({
        where: { id: data.equipmentId },
        data: { status: 'REPARO' }
    });

    const createServiceOrderQuery = prisma.serviceOrder.create({
        data: {
            ...data,
            openedById: loggedUserId,
            checklist: checklistData // Injeta o checklist clonado aqui (se existir)
        },
        include: {
            equipment: { include: { model: true } },
            customer: true,
            checklist: { include: { answers: true } } // Retorna a O.S. já com as perguntas para o frontend ver!
        }
    });

    // 4. Executamos tudo em uma única tacada
    const [updateEquipment, serviceOrder] = await prisma.$transaction([
        updateEquipmentQuery,
        createServiceOrderQuery
    ]);

    return serviceOrder;
};

export const listAllServiceOrders = async () => {
    const OSList = await prisma.serviceOrder.findMany({
        include: {
            equipment: {
                select: {
                    // description: true, <-- REMOVIDO PARA NÃO QUEBRAR
                    serial_number: true,
                    received_at: true,
                    returned_at: true,
                    status: true,
                    model: {          // <-- NOVO: Busca o nome do modelo no catálogo!
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

export const getServiceOrderById = async (id: string) => {
    const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { id },
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

            // 🟢 AQUI ESTÁ O FIX: Usamos o nome que o Prisma gerou
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

    // 🟢 A MÁGICA: Separamos o serviceOrderEvents e devolvemos como "events" para o frontend
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

export const updateServiceOrder = async (id: string, payload: UpdateOSData, loggedUserId: string) => {
    const { ...data } = payload;

    // 1. Buscamos a O.S. já trazendo os dados do checklist anexado
    const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { id },
        include: { checklist: true } // <-- INCLUÍDO AQUI
    });

    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    // 🛡️ TRAVA DE SEGURANÇA DO CHECKLIST E TRAVA DE SEGURANÇA DA SOLUÇÃO
    if (data.status === 'FINALIZADA') {
        // Se a O.S. possui um checklist, mas ele não tem data de conclusão (não foi respondido)
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
            where: { id: serviceOrder.equipmentId },
            data: {
                status: equipmentStatus,
                returned_at: new Date()
            }
        });
        queries.push(equipmentUpdateQuery);
    }

    const updateOSQuery = prisma.serviceOrder.update({
        where: { id },
        data: osDataToUpdate
    });
    queries.push(updateOSQuery);

    const result = await prisma.$transaction(queries);
    return result[result.length - 1];
};

export const cancelServiceOrder = async (id: string, reason: string, loggedUserId: string) => {
    // (O conteúdo desta função permanece inalterado, está perfeito)
    const serviceOrder = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    const cancelServiceQuery = prisma.serviceOrder.update({
        where: { id },
        data: {
            status: 'CANCELADA',
            cancellation_reason: reason,
            closed_at: new Date(),
            closedById: loggedUserId
        }
    });

    const updateEquipmentQuery = prisma.equipment.update({
        where: { id: serviceOrder.equipmentId },
        data: { status: 'OS_CANCELADA' }
    });

    await prisma.$transaction([cancelServiceQuery, updateEquipmentQuery]);

    return { message: 'Ordem de serviço cancelada' };
};

export const reopenServiceOrder = async (id: string, loggedUserId: string, reason: string) => { // 🟢 Adicionado 'reason'
    const serviceOrder = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!serviceOrder) throw new AppError('Ordem de serviço não encontrada', 404);

    if (serviceOrder.status === 'ABERTA') {
        throw new AppError('Esta ordem de serviço já está aberta', 400);
    }

    const reopenServiceQuery = prisma.serviceOrder.update({
        where: { id },
        data: {
            status: 'ABERTA',
            closed_at: null,
            closedById: null,
            cancellation_reason: null
        }
    });

    const updateEquipmentQuery = prisma.equipment.update({
        where: { id: serviceOrder.equipmentId },
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
            notes: reason // 🟢 Agora gravamos o motivo real digitado pelo usuário
        }
    });

    await prisma.$transaction([reopenServiceQuery, updateEquipmentQuery, eventLogQuery]);

    return { message: 'Ordem de serviço reaberta com sucesso' };
};

export const updateServiceOrderChecklist = async (
    serviceOrderId: string,
    payload: { notes?: string, answers: { id: string, is_ok: boolean, comment?: string; }[]; }
) => {
    // 1. Verificamos se a O.S. existe e se ela tem um checklist atrelado
    const os = await prisma.serviceOrder.findUnique({
        where: { id: serviceOrderId },
        include: { checklist: true }
    });

    if (!os || !os.checklist) {
        throw new AppError('Checklist não encontrado para esta ordem de serviço', 404);
    }

    const queries = [];

    // 2. Preparamos a atualização das notas gerais do checklist
    queries.push(prisma.serviceOrderChecklist.update({
        where: { id: os.checklist.id },
        data: {
            notes: payload.notes,
            completed_at: new Date() // Marcamos a data e hora que o técnico finalizou
        }
    }));

    // 3. Preparamos a atualização de cada resposta individualmente
    for (const answer of payload.answers) {
        queries.push(prisma.checklistAnswer.update({
            where: { id: answer.id },
            data: {
                is_ok: answer.is_ok,
                comment: answer.comment
            }
        }));
    }

    // 4. Disparamos a transação: ou salva todas as respostas, ou não salva nenhuma
    await prisma.$transaction(queries);

    return { message: 'Checklist preenchido e salvo com sucesso' };
};

export const addPartToServiceOrder = async (osId: string, partId: string, quantity: number, loggedUserId: string) => {
    // 1. Verifica se a O.S. existe e se não está finalizada/cancelada
    const os = await prisma.serviceOrder.findUnique({ where: { id: osId } });
    if (!os) throw new AppError("Ordem de Serviço não encontrada.", 404);
    if (os.status !== 'ABERTA') throw new AppError("Não é possível adicionar peças em uma O.S. que não está aberta.", 403);

    // 2. Verifica se a peça existe e tem estoque
    const part = await prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new AppError("Peça não encontrada no catálogo.", 404);

    if (part.current_stock < quantity) {
        throw new AppError(`Estoque insuficiente. Saldo atual da peça '${part.name}': ${part.current_stock} un.`, 400);
    }

    // 3. Transação: Grava na O.S, faz a Movimentação e Baixa o Estoque de uma vez só!
    const result = await prisma.$transaction([

        // A) Adiciona a peça na O.S.
        prisma.partReplaced.create({
            data: {
                serviceOrderId: osId,
                partId: partId,
                quantity: quantity,
                unit_price: part.sale_price // Congela o preço de venda da DWL Diagnostica no momento do uso
            }
        }),

        // B) Gera o log de auditoria no estoque
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

        // C) Abate o saldo físico da peça atomicamente
        prisma.part.update({
            where: { id: partId },
            data: {
                current_stock: {
                    decrement: quantity
                }
            }
        })
    ]);

    return result[0]; // Retorna o registro da peça adicionada
};

export const saveClientSignature = async (id: string, signatureBase64: string) => {
    // 1. Verifica se a O.S. existe e se ainda está aberta
    const os = await prisma.serviceOrder.findUnique({ where: { id } });

    if (!os) throw new AppError('Ordem de serviço não encontrada.', 404);
    if (os.status !== 'ABERTA') {
        throw new AppError('Não é possível adicionar uma assinatura em uma O.S. finalizada ou cancelada.', 403);
    }

    // 2. Salva a string Base64 direto no banco
    const updatedOS = await prisma.serviceOrder.update({
        where: { id },
        data: { client_signature: signatureBase64 },
        select: { id: true, client_signature: true }
    });

    return updatedOS;
};

export const generateServiceOrderPdf = async (id: string) => {
    // 1. Busca todos os dados da O.S. (agora incluindo o checklist completo)
    const os = await prisma.serviceOrder.findUnique({
        where: { id },
        include: {
            customer: true,
            equipment: { include: { model: true } },
            parts_replaced: { include: { part: true } },
            closedBy: true,
            serviceOrderEvents: {
                orderBy: { created_at: 'asc' },
                include: { user: { select: { name: true } } }
            },
            // 🟢 NOVO: Trazendo o checklist e as respostas ordenadas
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

    // 🟢 PREPARANDO DADOS DO CHECKLIST PARA O TEMPLATE
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
        console.warn('Logo da empresa não encontrada na pasta assets.');
    }

    const dateToPrint = os.closed_at ? new Date(os.closed_at) : new Date();
    const formattedClosingDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dateToPrint);

    const templateData = {
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

        // 🟢 NOVAS VARIÁVEIS INJETADAS NO HANDLEBARS
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

export const sendServiceOrderEmail = async (id: string, customEmail?: string) => {
    // 1. Busca os dados essenciais para o e-mail
    const os = await prisma.serviceOrder.findUnique({
        where: { id },
        include: {
            customer: true,
            equipment: { include: { model: true } }
        }
    });

    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    // 2. Define o destinatário (prioriza o e-mail digitado no tablet, ou usa o do cadastro)
    const recipientEmail = customEmail || os.customer.email;

    if (!recipientEmail) {
        throw new AppError('Nenhum e-mail de destino foi informado e o cliente não possui e-mail cadastrado.', 400);
    }

    // 3. Garante que o PDF esteja atualizado e pega o caminho dele
    // A nossa função já faz toda a matemática e gera o arquivo físico
    const pdfRelativeUrl = await generateServiceOrderPdf(id);

    // Transforma "/uploads/os_pdfs/arquivo.pdf" no caminho físico absoluto do servidor
    const fileName = pdfRelativeUrl.split('/').pop() as string;
    const pdfPhysicalPath = path.resolve(process.cwd(), 'uploads', 'os_pdfs', fileName);

    // 4. Prepara o Corpo do E-mail (HTML)
    const templatePath = path.resolve(process.cwd(), 'src', 'templates', 'os-email.hbs');
    const templateFile = fs.readFileSync(templatePath, 'utf-8');
    const compileTemplate = handlebars.compile(templateFile);
    const logoPath = path.resolve(process.cwd(), 'src', 'assets', 'logo_dwl.png');

    const htmlBody = compileTemplate({
        customerName: os.customer.name,
        osNumber: `${os.number}/${new Date(os.opened_at).getFullYear()}`,
        equipmentModel: os.equipment?.model.name || 'Não especificado',
        serialNumber: os.equipment?.serial_number || 'Não especificado'
    });

    // 5. Instancia o Provedor e Dispara
    const mailProvider = new MailProvider();

    await mailProvider.sendMail({
        to: recipientEmail,
        subject: `DWL Diagnóstica - Relatório Técnico da O.S. ${os.number}`,
        body: htmlBody,
        attachments: [
            {
                filename: `Relatorio_OS_${os.number}.pdf`,
                path: pdfPhysicalPath,
                contentType: 'application/pdf'
            },
            {
                filename: 'logo.png',
                path: logoPath,
                cid: 'logo_dwl' // Esse é o "apelido" que vamos chamar no HTML
            }
        ]
    });

    return { message: 'E-mail enviado com sucesso!', recipient: recipientEmail };
};

export const generateNiimbotLabel = async (id: string) => {
    const os = await prisma.serviceOrder.findUnique({
        where: { id },
        include: { equipment: true }
    });

    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    const baseUrl = process.env.BACKEND_URL || 'https://tech-support-api-zk62.onrender.com';
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

    // 🟢 Busca e converte a logo para a etiqueta
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
        width: '50mm', // 🟢 Ajustado para 50mm
        height: '30mm',
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    return setFullURL(`/uploads/os_pdfs/${fileName}`);
};

export const addServiceOrderImage = async (osId: string, tag: 'ANTES' | 'DURANTE' | 'DEPOIS', tmpFileName: string) => {
    const os = await prisma.serviceOrder.findUnique({ where: { id: osId } });
    if (!os) throw new AppError('Ordem de serviço não encontrada', 404);

    const storageProvider = new DiskStorageProvider();
    const finalFileName = `os-${os.number}-${new Date().getTime()}`;

    // Converte para WebP e move da pasta tmp para a pasta os_images
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

export const removeServiceOrderImage = async (imageId: string) => {
    const image = await prisma.serviceOrderImage.findUnique({ where: { id: imageId } });
    if (!image) throw new AppError('Imagem não encontrada', 404);

    // Remove fisicamente o arquivo do servidor
    const storageProvider = new DiskStorageProvider();
    await storageProvider.deleteFile(image.url, 'os_images');

    // Remove a referência do banco de dados
    await prisma.serviceOrderImage.delete({ where: { id: imageId } });

    return { message: 'Imagem removida com sucesso' };
};