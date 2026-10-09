import { RequestHandler } from "express";
import * as DashboardService from "../services/dashboard.service";

export const getMetrics: RequestHandler = async (req, res) => {
    const metrics = await DashboardService.getDashboardMetrics();
    res.json({ success: true, data: metrics });
};