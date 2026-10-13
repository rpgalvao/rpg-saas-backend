import { RequestHandler } from "express";
import fs from "fs/promises";
import { AppError } from "../errors/AppError";
import * as TenantService from "../services/tenant.service";
import { updateTenantSchema } from "../validators/tenant.validator";

export const getMe: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const tenant = await TenantService.getTenant(req.user.tenantId);
    res.json({ success: true, data: tenant });
};

export const updateMe: RequestHandler = async (req, res, next) => {
    const file = req.file;

    try {
        if (!req.user) throw new AppError('Usuário não autenticado', 401);

        const data = updateTenantSchema.parse(req.body);
        const tenant = await TenantService.updateTenant(req.user.tenantId, data, file);

        res.json({ success: true, data: tenant });
    } catch (error) {
        if (file?.path) {
            await fs.unlink(file.path).catch(() => { });
        }
        next(error);
    }
};
