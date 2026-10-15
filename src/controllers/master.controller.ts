import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import * as MasterService from "../services/master.service";
import { createMasterTenantSchema, tenantIdParamSchema } from "../validators/master.validator";

export const listTenants: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const tenants = await MasterService.listTenants();
    res.json({ success: true, data: tenants });
};

export const createTenant: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const data = createMasterTenantSchema.parse(req.body);
    const tenant = await MasterService.createTenantWithAdmin(data);

    res.status(201).json({ success: true, data: tenant });
};

export const toggleTenant: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = tenantIdParamSchema.parse(req.params);
    const tenant = await MasterService.toggleTenantStatus(id);
    const message = tenant.active
        ? 'Assinatura reativada com sucesso'
        : 'Assinatura suspensa com sucesso';

    res.json({ success: true, message, data: tenant });
};
