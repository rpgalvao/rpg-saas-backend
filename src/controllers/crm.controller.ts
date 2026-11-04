import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import * as CrmService from "../services/crm.service";
import {
    createDealSchema,
    dealIdSchema,
    moveDealSchema,
    updateDealStatusSchema,
} from "../validators/crm.validator";

export const getPipeline: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const pipeline = await CrmService.getPipeline(tenantId);
    res.json({ success: true, data: pipeline });
};

export const createDeal: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createDealSchema.parse(req.body);
    const deal = await CrmService.createDeal(tenantId, data);
    res.status(201).json({ success: true, data: deal });
};

export const moveDeal: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = dealIdSchema.parse(req.params);
    const { newStageId } = moveDealSchema.parse(req.body);
    const deal = await CrmService.moveDeal(tenantId, id, newStageId);
    res.json({ success: true, data: deal });
};

export const updateDealStatus: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = dealIdSchema.parse(req.params);
    const { status } = updateDealStatusSchema.parse(req.body);
    const deal = await CrmService.updateDealStatus(tenantId, id, status);
    res.json({ success: true, data: deal });
};
