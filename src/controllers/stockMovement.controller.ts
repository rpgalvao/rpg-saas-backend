import { RequestHandler } from "express";
import * as StockMovementService from "../services/stockMovement.service";
import { createMovementSchema } from "../validators/stockMovement.validator";
import { AppError } from "../errors/AppError";

export const createMovement: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createMovementSchema.parse(req.body);
    const result = await StockMovementService.createMovement(data, tenantId, req.user.id);
    res.status(201).json({ success: true, data: result });
};

export const getMovements: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    // Permite filtrar as movimentações de uma peça específica via Query Params (?partId=...)
    const partId = req.query.partId as string | undefined;
    const movements = await StockMovementService.getAllMovements(tenantId, partId);
    res.json({ success: true, data: movements });
};