import { RequestHandler } from "express";
import * as CustomerService from "../services/customer.service";
import { createCustomerSchema, getCustomerIdSchema, updateCustomerSchema } from "../validators/customer.validator";

export const insertCustomer: RequestHandler = async (req, res) => {
    const data = createCustomerSchema.parse(req.body);
    const customer = await CustomerService.createCustomer(data);
    res.status(201).json({ success: true, data: customer });
};

export const getCustomers: RequestHandler = async (req, res) => {
    const customersList = await CustomerService.getCustomersList();
    res.json({ success: true, data: customersList });
};

export const getCustomerById: RequestHandler = async (req, res) => {
    const { id } = getCustomerIdSchema.parse(req.params);
    const customer = await CustomerService.getCustomerById(id);
    res.json({ success: true, data: customer });
};

export const updateCustomer: RequestHandler = async (req, res) => {
    const { id } = getCustomerIdSchema.parse(req.params);
    const data = updateCustomerSchema.parse(req.body);
    const updatedCustomer = await CustomerService.updateCustomer(id, data);
    res.json({ success: true, data: updatedCustomer });
};

export const removeCustomer: RequestHandler = async (req, res) => {
    const { id } = getCustomerIdSchema.parse(req.params);
    const customer = await CustomerService.deleteCustomer(id);
    res.json({ success: true, data: customer });
};