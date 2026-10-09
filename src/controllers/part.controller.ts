import { RequestHandler } from "express";
import * as PartService from "../services/part.service";
import { createPartSchema, updatePartSchema } from "../validators/part.validator";

export const createPart: RequestHandler = async (req, res) => {
    const data = createPartSchema.parse(req.body);
    const part = await PartService.createPart(data);
    res.status(201).json({ success: true, data: part });
};

export const getParts: RequestHandler = async (req, res) => {
    const includeInactive = req.query.all === 'true';
    const parts = await PartService.getAllParts(includeInactive);
    res.json({ success: true, data: parts });
};

export const getPart: RequestHandler = async (req, res) => {
    const { id } = req.params as { id: string; };
    const part = await PartService.getPartById(id);

    if (!part) {
        res.status(404).json({ success: false, message: "Peça não encontrada." });
        return;
    }
    res.json({ success: true, data: part });
};

export const updatePart: RequestHandler = async (req, res) => {
    const { id } = req.params as { id: string; };
    const data = updatePartSchema.parse(req.body);

    const part = await PartService.updatePart(id, data);
    res.json({ success: true, data: part });
};

export const deletePart: RequestHandler = async (req, res) => {
    const { id } = req.params as { id: string; };

    await PartService.deletePart(id);
    res.json({ success: true, message: "Peça inativada com sucesso." });
};

export const getLowStockDashboard: RequestHandler = async (req, res) => {
    const lowStockParts = await PartService.getLowStockParts();
    res.json({ success: true, data: lowStockParts });
};