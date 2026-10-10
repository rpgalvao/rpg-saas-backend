import { RequestHandler } from "express";
import * as EquipmentService from "../services/equipment.service";
import { createEquipmentSchema, getEquipmentIdSchema, getEquipmentListSchema, getEquipmentSerialNumberSchema, updateEquipmentSchema } from "../validators/equipment.validator";
import { AppError } from "../errors/AppError";

export const insertEquipment: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const data = createEquipmentSchema.parse(req.body);
    const newEquipment = await EquipmentService.createEquipment(data, tenantId);
    res.status(201).json({ success: true, data: newEquipment });
};

export const getEquipmentList: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { status, customerId } = getEquipmentListSchema.parse(req.query);
    const equipments = await EquipmentService.listEquipments(tenantId, { status, customerId });
    res.json({ success: true, data: equipments });
};

export const getEquipmentById: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = getEquipmentIdSchema.parse(req.params);
    const equipment = await EquipmentService.getEquipmentById(id, tenantId);
    res.json({ success: true, data: equipment });
};

export const getEquipmentBySerialNumber: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { serial_number } = getEquipmentSerialNumberSchema.parse(req.params);
    const equipment = await EquipmentService.getEquipmentBySerialNumber(serial_number, tenantId);
    res.json({ success: true, data: equipment });
};

export const updateEquipment: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = getEquipmentIdSchema.parse(req.params);
    const data = updateEquipmentSchema.parse(req.body);
    const updatedEquipment = await EquipmentService.updateEquipment(id, tenantId, data);
    res.json({ success: true, data: updatedEquipment });
};

export const removeEquipment: RequestHandler = async (req, res) => {
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    const { tenantId } = req.user;

    const { id } = getEquipmentIdSchema.parse(req.params);
    const equipment = await EquipmentService.removeEquipment(id, tenantId);
    res.json({ success: true, data: equipment });
};