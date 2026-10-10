import { RequestHandler } from "express";
import * as PartService from "../services/part.service";
import { createPartSchema, updatePartSchema } from "../validators/part.validator";
import { AppError } from "../errors/AppError";

export const createPart: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createPartSchema.parse(req.body);
    const part = await PartService.createPart(data, tenantId);
    res.status(201).json({ success: true, data: part });
};

export const getParts: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const includeInactive = req.query.all === 'true';
    const parts = await PartService.getAllParts(tenantId, includeInactive);
    res.json({ success: true, data: parts });
};

export const getPart: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = req.params as { id: string; };
    const part = await PartService.getPartById(id, tenantId);

    if (!part) {
        res.status(404).json({ success: false, message: "Peça não encontrada." });
        return;
    }
    res.json({ success: true, data: part });
};

export const updatePart: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = req.params as { id: string; };
    const data = updatePartSchema.parse(req.body);

    const part = await PartService.updatePart(id, tenantId, data);
    res.json({ success: true, data: part });
};

export const deletePart: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = req.params as { id: string; };

    await PartService.deletePart(id, tenantId);
    res.json({ success: true, message: "Peça inativada com sucesso." });
};

export const getLowStockDashboard: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const lowStockParts = await PartService.getLowStockParts(tenantId);
    res.json({ success: true, data: lowStockParts });
};