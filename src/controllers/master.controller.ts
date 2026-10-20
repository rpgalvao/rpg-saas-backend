import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";
import * as MasterService from "../services/master.service";
import {
    createMasterTenantSchema,
    createTenantPaymentSchema,
    tenantIdParamSchema,
    tenantPaymentParamsSchema,
    updateMasterTenantSchema,
    updateTenantPaymentSchema,
} from "../validators/master.validator";

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

export const getTenant: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = tenantIdParamSchema.parse(req.params);
    const tenant = await MasterService.getTenantById(id);

    res.json({ success: true, data: tenant });
};

export const updateTenant: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = tenantIdParamSchema.parse(req.params);
    const data = updateMasterTenantSchema.parse(req.body);
    const tenant = await MasterService.updateTenant(id, data);

    res.json({ success: true, data: tenant });
};

export const listTenantUsers: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = tenantIdParamSchema.parse(req.params);
    const users = await MasterService.listTenantUsers(id);

    res.json({ success: true, data: users });
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

export const listTenantPayments: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = tenantIdParamSchema.parse(req.params);
    const payments = await MasterService.listTenantPayments(id);

    res.json({ success: true, data: payments });
};

export const createTenantPayment: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { id } = tenantIdParamSchema.parse(req.params);
    const data = createTenantPaymentSchema.parse(req.body);
    const payment = await MasterService.createTenantPayment(id, data);

    res.status(201).json({ success: true, data: payment });
};

export const updateTenantPayment: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { tenantId, paymentId } = tenantPaymentParamsSchema.parse(req.params);
    const data = updateTenantPaymentSchema.parse(req.body);
    const payment = await MasterService.updateTenantPayment(tenantId, paymentId, data);

    res.json({ success: true, data: payment });
};

export const deleteTenantPayment: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);

    const { tenantId, paymentId } = tenantPaymentParamsSchema.parse(req.params);
    await MasterService.deleteTenantPayment(tenantId, paymentId);

    res.json({ success: true, message: 'Pagamento excluído com sucesso' });
};
