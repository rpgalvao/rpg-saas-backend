import { RequestHandler } from "express";
import * as EquipmentModelService from "../services/equipmentModel.service";
import { createEquipmentModelSchema, equipmentModelIdSchema } from "../validators/equipmentModel.validator";
import { AppError } from "../errors/AppError";

export const createEquipmentModel: RequestHandler = async (req, res) => {
    // 🛡️ Proteção: Apenas ADMIN pode criar modelos no catálogo
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    if (req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem cadastrar novos equipamentos.', 403);
    }

    const data = createEquipmentModelSchema.parse(req.body);
    const newModel = await EquipmentModelService.createEquipmentModel(data);

    res.status(201).json({ success: true, data: newModel });
};

export const listEquipmentModels: RequestHandler = async (req, res) => {
    // Captura o query param ?includeInactive=true
    const includeInactive = req.query.includeInactive === 'true';
    const models = await EquipmentModelService.listAllEquipmentModels(includeInactive);
    res.json({ success: true, data: models });
};

export const getEquipmentModelById: RequestHandler = async (req, res) => {
    const { id } = equipmentModelIdSchema.parse(req.params);
    const model = await EquipmentModelService.getEquipmentModelById(id);
    res.json({ success: true, data: model });
};

export const toggleEquipmentModelStatus: RequestHandler = async (req, res) => {
    // 🛡️ Proteção: Apenas ADMIN pode desativar/reativar modelos
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    if (req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem alterar o status dos modelos.', 403);
    }

    const { id } = equipmentModelIdSchema.parse(req.params);
    const updatedModel = await EquipmentModelService.toggleEquipmentModelStatus(id);

    res.json({ success: true, data: updatedModel });
};

export const updateEquipmentModel: RequestHandler = async (req, res) => {
    // 🛡️ Proteção: Apenas ADMIN pode editar modelos
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    if (req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem editar o nome dos modelos.', 403);
    }

    const { id } = equipmentModelIdSchema.parse(req.params);
    const data = createEquipmentModelSchema.parse(req.body);

    const updatedModel = await EquipmentModelService.updateEquipmentModel(id, data);

    res.json({ success: true, data: updatedModel });
};