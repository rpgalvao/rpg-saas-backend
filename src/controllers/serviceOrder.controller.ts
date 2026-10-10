import { RequestHandler } from "express";
import * as ServiceOrder from "../services/serviceOrder.service";
import { addPartToOsSchema, cancelServiceOrderSchema, emailSchema, openServiceOrderSchema, removeImageSchema, reopenServiceOrderSchema, serviceOrderIdSchema, signatureSchema, updateChecklistSchema, updateServiceOrderSchema, uploadOsImageSchema } from "../validators/serviceOrder.validator";
import { AppError } from "../errors/AppError";

export const createServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { tenantId } = req.user;

    const data = openServiceOrderSchema.parse(req.body);
    const serviceOrder = await ServiceOrder.createServiceOrder(data, loggedId, tenantId);
    res.status(201).json({ success: true, data: serviceOrder });
};

export const listServiceOrders: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const serviceOrders = await ServiceOrder.listAllServiceOrders(tenantId);
    res.json({ success: true, data: serviceOrders });
};

export const listServiceOrderById: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const serviceOrder = await ServiceOrder.getServiceOrderById(id, tenantId);
    res.json({ success: true, data: serviceOrder });
};

export const updateServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const data = updateServiceOrderSchema.parse(req.body);
    const updatedOS = await ServiceOrder.updateServiceOrder(id, tenantId, data, loggedId);
    res.json({ success: true, data: updatedOS });
};

export const cancelServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { reason } = cancelServiceOrderSchema.parse(req.body);
    const message = await ServiceOrder.cancelServiceOrder(id, tenantId, reason, loggedId);
    res.json({ success: true, data: message });
};

export const reopenServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { reason } = reopenServiceOrderSchema.parse(req.body);

    const message = await ServiceOrder.reopenServiceOrder(id, tenantId, loggedId, reason);
    res.json({ success: true, data: message });
};

export const updateChecklist: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const data = updateChecklistSchema.parse(req.body);

    const result = await ServiceOrder.updateServiceOrderChecklist(id, tenantId, data);
    res.json({ success: true, data: result });
};

export const addPart: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { tenantId } = req.user;

    const { id: osId } = serviceOrderIdSchema.parse(req.params);
    const { partId, quantity } = addPartToOsSchema.parse(req.body);

    const result = await ServiceOrder.addPartToServiceOrder(osId, tenantId, partId, quantity, loggedId);

    res.status(201).json({ success: true, data: result });
};

export const saveClientSignature: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { signature } = signatureSchema.parse(req.body);

    const updatedOS = await ServiceOrder.saveClientSignature(id, tenantId, signature);

    res.json({ success: true, message: 'Assinatura registrada com sucesso!', data: { signature_url: updatedOS.client_signature } });
};

// 🟢 FUNÇÃO PÚBLICA (QR CODE) - Não extrai req.user.tenantId
export const exportPdf: RequestHandler = async (req, res) => {
    const { id } = serviceOrderIdSchema.parse(req.params);
    const pdfUrl = await ServiceOrder.generateServiceOrderPdf(id);

    res.json({ success: true, message: 'Relatório gerado com sucesso!', data: { pdf_url: pdfUrl } });
};

export const sendEmail: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { customEmail } = emailSchema.parse(req.body);

    const result = await ServiceOrder.sendServiceOrderEmail(id, tenantId, customEmail);

    res.json({ success: true, message: result.message, data: { sent_to: result.recipient } });
};

export const generateLabel: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const labelUrl = await ServiceOrder.generateNiimbotLabel(id, tenantId);
    res.json({ success: true, labelUrl });
};

// 🟢 FUNÇÃO PÚBLICA (QR CODE CELULAR) - Não extrai req.user.tenantId
export const viewPdfFromQr: RequestHandler = async (req, res) => {
    const { id } = serviceOrderIdSchema.parse(req.params);
    const pdfUrl = await ServiceOrder.generateServiceOrderPdf(id);

    // Redirecionamento direto para o arquivo estático
    res.redirect(pdfUrl);
};

export const uploadImage: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { tag } = uploadOsImageSchema.parse(req.body);

    if (!req.file) {
        throw new AppError('Nenhum arquivo de imagem foi enviado.', 400);
    }

    const image = await ServiceOrder.addServiceOrderImage(id, tenantId, tag as any, req.file.filename);
    res.status(201).json({ success: true, data: image });
};

export const removeImage: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { imageId } = removeImageSchema.parse(req.params);
    const result = await ServiceOrder.removeServiceOrderImage(imageId, tenantId);

    res.json({ success: true, data: result });
};