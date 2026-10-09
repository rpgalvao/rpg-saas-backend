import fs from "fs";
import { RequestHandler } from "express";
import * as ServiceOrder from "../services/serviceOrder.service";
import { addPartToOsSchema, cancelServiceOrderSchema, emailSchema, openServiceOrderSchema, removeImageSchema, reopenServiceOrderSchema, serviceOrderIdSchema, signatureSchema, updateChecklistSchema, updateServiceOrderSchema, uploadOsImageSchema } from "../validators/serviceOrder.validator";
import { AppError } from "../errors/AppError";

export const createServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const data = openServiceOrderSchema.parse(req.body);
    const serviceOrder = await ServiceOrder.createServiceOrder(data, loggedId);
    res.status(201).json({ success: true, data: serviceOrder });
};

export const listServiceOrders: RequestHandler = async (req, res) => {
    const serviceOrders = await ServiceOrder.listAllServiceOrders();
    res.json({ success: true, data: serviceOrders });
};

export const listServiceOrderById: RequestHandler = async (req, res) => {
    const { id } = serviceOrderIdSchema.parse(req.params);
    const serviceOrder = await ServiceOrder.getServiceOrderById(id);
    res.json({ success: true, data: serviceOrder });
};

export const updateServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { id } = serviceOrderIdSchema.parse(req.params);
    const data = updateServiceOrderSchema.parse(req.body);
    const updatedOS = await ServiceOrder.updateServiceOrder(id, data, loggedId);
    res.json({ success: true, data: updatedOS });
};

export const cancelServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const loggedId = req.user.id;
    const { id } = serviceOrderIdSchema.parse(req.params);
    const { reason } = cancelServiceOrderSchema.parse(req.body);
    const message = await ServiceOrder.cancelServiceOrder(id, reason, loggedId);
    res.json({ success: true, data: message });
};

export const reopenServiceOrder: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const loggedId = req.user.id;
    const { id } = serviceOrderIdSchema.parse(req.params);

    const { reason } = reopenServiceOrderSchema.parse(req.body);

    const message = await ServiceOrder.reopenServiceOrder(id, loggedId, reason);
    res.json({ success: true, data: message });
};

export const updateChecklist: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    // Reaproveitamos o validador de ID da O.S.
    const { id } = serviceOrderIdSchema.parse(req.params);
    // Validamos o array de respostas
    const data = updateChecklistSchema.parse(req.body);

    const result = await ServiceOrder.updateServiceOrderChecklist(id, data);
    res.json({ success: true, data: result });
};

export const addPart: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const loggedId = req.user.id;
    const { id: osId } = serviceOrderIdSchema.parse(req.params); // Reaproveitando sua validação!
    const { partId, quantity } = addPartToOsSchema.parse(req.body);

    const result = await ServiceOrder.addPartToServiceOrder(osId, partId, quantity, loggedId);

    res.status(201).json({ success: true, data: result });
};

export const saveClientSignature: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { signature } = signatureSchema.parse(req.body);

    const updatedOS = await ServiceOrder.saveClientSignature(id, signature);

    res.json({ success: true, message: 'Assinatura registrada com sucesso!', data: { signature_url: updatedOS.client_signature } });
};

export const exportPdf: RequestHandler = async (req, res, next) => {

    const { id } = serviceOrderIdSchema.parse(req.params);
    const pdfUrl = await ServiceOrder.generateServiceOrderPdf(id);

    res.json({ success: true, message: 'Relatório gerado com sucesso!', data: { pdf_url: pdfUrl } });
};

export const sendEmail: RequestHandler = async (req, res, next) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { customEmail } = emailSchema.parse(req.body);

    const result = await ServiceOrder.sendServiceOrderEmail(id, customEmail);

    res.json({ success: true, message: result.message, data: { sent_to: result.recipient } });
};

export const generateLabel: RequestHandler = async (req, res) => {
    const { id } = serviceOrderIdSchema.parse(req.params);
    const labelUrl = await ServiceOrder.generateNiimbotLabel(id);
    res.json({ success: true, labelUrl });
};

export const viewPdfFromQr: RequestHandler = async (req, res, next) => {
    const { id } = serviceOrderIdSchema.parse(req.params);
    const pdfUrl = await ServiceOrder.generateServiceOrderPdf(id);

    // 🟢 O redirecionamento mágico: empurra o celular direto para o arquivo estático
    res.redirect(pdfUrl);
};

export const uploadImage: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = serviceOrderIdSchema.parse(req.params);
    const { tag } = uploadOsImageSchema.parse(req.body);

    if (!req.file) {
        throw new AppError('Nenhum arquivo de imagem foi enviado.', 400);
    }

    const image = await ServiceOrder.addServiceOrderImage(id, tag as any, req.file.filename);
    res.status(201).json({ success: true, data: image });
};

export const removeImage: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { imageId } = removeImageSchema.parse(req.params);
    const result = await ServiceOrder.removeServiceOrderImage(imageId);

    res.json({ success: true, data: result });
};