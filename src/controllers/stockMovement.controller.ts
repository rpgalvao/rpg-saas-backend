import { RequestHandler } from "express";
import * as StockMovementService from "../services/stockMovement.service";
import { createMovementSchema } from "../validators/stockMovement.validator";

export const createMovement: RequestHandler = async (req, res) => {
    const data = createMovementSchema.parse(req.body);
    const result = await StockMovementService.createMovement(data);
    res.status(201).json({ success: true, data: result });
};

export const getMovements: RequestHandler = async (req, res) => {
    // Permite filtrar as movimentações de uma peça específica via Query Params (?partId=...)
    const partId = req.query.partId as string | undefined;
    const movements = await StockMovementService.getAllMovements(partId);
    res.json({ success: true, data: movements });
};