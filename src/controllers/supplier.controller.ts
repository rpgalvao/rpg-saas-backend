import { RequestHandler } from "express";
import * as SupplierService from "../services/supplier.service";
import { createSupplierSchema, updateSupplierSchema } from "../validators/supplier.validator";
import { AppError } from "../errors/AppError";

export const createSupplier: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createSupplierSchema.parse(req.body);
    const supplier = await SupplierService.createSupplier(data, tenantId);
    res.status(201).json({ success: true, data: supplier });
};

export const getSuppliers: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    // Se passar ?all=true na URL, traz os inativos também
    const includeInactive = req.query.all === 'true';
    const suppliers = await SupplierService.getAllSuppliers(tenantId, includeInactive);
    res.json({ success: true, data: suppliers });
};

export const getSupplier: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = req.params as { id: string; };
    const supplier = await SupplierService.getSupplierById(id, tenantId);
    if (!supplier) {
        res.status(404).json({ success: false, message: "Fornecedor não encontrado." });
        return;
    }
    res.json({ success: true, data: supplier });
};

export const updateSupplier: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = req.params as { id: string; };
    const data = updateSupplierSchema.parse(req.body);
    const supplier = await SupplierService.updateSupplier(id, tenantId, data);
    res.json({ success: true, data: supplier });
};

export const deleteSupplier: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = req.params as { id: string; };
    await SupplierService.deleteSupplier(id, tenantId);
    res.json({ success: true, message: "Fornecedor inativado com sucesso." });
};