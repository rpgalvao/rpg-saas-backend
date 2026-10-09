import { RequestHandler } from "express";
import * as EquipmentService from "../services/equipment.service";
import { createEquipmentSchema, getEquipmentIdSchema, getEquipmentListSchema, getEquipmentSerialNumberSchema, updateEquipmentSchema } from "../validators/equipment.validator";

export const insertEquipment: RequestHandler = async (req, res) => {
    const data = createEquipmentSchema.parse(req.body);
    const newEquipment = await EquipmentService.createEquipment(data);
    res.status(201).json({ success: true, data: newEquipment });
};

export const getEquipmentList: RequestHandler = async (req, res) => {
    const { status, customerId } = getEquipmentListSchema.parse(req.query);
    const equipments = await EquipmentService.listEquipments({ status, customerId });
    res.json({ success: true, data: equipments });
};

export const getEquipmentById: RequestHandler = async (req, res) => {
    const { id } = getEquipmentIdSchema.parse(req.params);
    const equipment = await EquipmentService.getEquipmentById(id);
    res.json({ success: true, data: equipment });
};

export const getEquipmentBySerialNumber: RequestHandler = async (req, res) => {
    const { serial_number } = getEquipmentSerialNumberSchema.parse(req.params);
    const equipment = await EquipmentService.getEquipmentBySerialNumber(serial_number);
    res.json({ success: true, data: equipment });
};

export const updateEquipment: RequestHandler = async (req, res) => {
    const { id } = getEquipmentIdSchema.parse(req.params);
    const data = updateEquipmentSchema.parse(req.body);
    const updatedEquipment = await EquipmentService.updateEquipment(id, data);
    res.json({ success: true, data: updatedEquipment });
};

export const removeEquipment: RequestHandler = async (req, res) => {
    const { id } = getEquipmentIdSchema.parse(req.params);
    const equipment = await EquipmentService.removeEquipment(id);
    res.json({ success: true, data: equipment });
};