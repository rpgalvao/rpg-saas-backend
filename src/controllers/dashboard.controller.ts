import { RequestHandler } from "express";
import * as DashboardService from "../services/dashboard.service";
import { AppError } from "../errors/AppError";

export const getMetrics: RequestHandler = async (req, res) => {
    // 🛡️ Proteção e extração do tenantId
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const metrics = await DashboardService.getDashboardMetrics(tenantId);
    res.json({ success: true, data: metrics });
};