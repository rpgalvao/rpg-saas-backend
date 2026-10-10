import { RequestHandler } from "express";
import * as CustomerService from "../services/customer.service";
import { createCustomerSchema, getCustomerIdSchema, updateCustomerSchema } from "../validators/customer.validator";
import { AppError } from "../errors/AppError";

export const insertCustomer: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createCustomerSchema.parse(req.body);
    const customer = await CustomerService.createCustomer(data, tenantId);
    res.status(201).json({ success: true, data: customer });
};

export const getCustomers: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const customersList = await CustomerService.getCustomersList(tenantId);
    res.json({ success: true, data: customersList });
};

export const getCustomerById: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = getCustomerIdSchema.parse(req.params);
    const customer = await CustomerService.getCustomerById(id, tenantId);
    res.json({ success: true, data: customer });
};

export const updateCustomer: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = getCustomerIdSchema.parse(req.params);
    const data = updateCustomerSchema.parse(req.body);
    const updatedCustomer = await CustomerService.updateCustomer(id, tenantId, data);
    res.json({ success: true, data: updatedCustomer });
};

export const removeCustomer: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = getCustomerIdSchema.parse(req.params);
    const customer = await CustomerService.deleteCustomer(id, tenantId);
    res.json({ success: true, data: customer });
};