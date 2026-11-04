import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import * as QuoteService from "../services/quote.service";
import {
    createQuoteSchema,
    dealIdParamSchema,
    quoteIdSchema,
    updateQuoteStatusSchema,
} from "../validators/quote.validator";

export const createQuote: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createQuoteSchema.parse(req.body);
    const quote = await QuoteService.createQuote(tenantId, data);
    res.status(201).json({ success: true, data: quote });
};

export const getQuotesByDeal: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { dealId } = dealIdParamSchema.parse(req.params);
    const quotes = await QuoteService.getQuotesByDeal(tenantId, dealId);
    res.json({ success: true, data: quotes });
};

export const updateQuoteStatus: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = quoteIdSchema.parse(req.params);
    const { status } = updateQuoteStatusSchema.parse(req.body);
    const quote = await QuoteService.updateQuoteStatus(tenantId, id, status);
    res.json({ success: true, data: quote });
};
