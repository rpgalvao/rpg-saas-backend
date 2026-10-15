import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

export const createEquipmentModel = async (data: { name: string; brand?: string; }, tenantId: string) => {
    const modelExists = await prisma.equipmentModel.findUnique({
        where: {
            name_tenantId: {
                name: data.name,
                tenantId
            }
        }
    });

    if (modelExists) {
        throw new AppError('Já existe um modelo de equipamento com este nome', 409);
    }

    const newModel = await prisma.equipmentModel.create({
        data: {
            name: data.name,
            brand: data.brand,
            tenantId
        }
    });

    return newModel;
};

export const listAllEquipmentModels = async (tenantId: string, includeInactive: boolean = false) => {
    const models = await prisma.equipmentModel.findMany({
        // Se includeInactive for true, não filtra por active. Se for false, traz só os ativos.
        where: {
            tenantId,
            ...(includeInactive ? {} : { active: true })
        },
        orderBy: { name: 'asc' }
    });
    return models;
};

export const getEquipmentModelById = async (id: string, tenantId: string) => {
    const model = await prisma.equipmentModel.findFirst({
        where: { id, tenantId, active: true }
    });

    if (!model) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    return model;
};

export const toggleEquipmentModelStatus = async (id: string, tenantId: string) => {
    const model = await prisma.equipmentModel.findFirst({
        where: { id, tenantId }
    });

    if (!model) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    const updatedModel = await prisma.equipmentModel.update({
        where: { id, tenantId },
        data: { active: !model.active } // Inverte o valor atual
    });

    return updatedModel;
};

export const updateEquipmentModel = async (id: string, tenantId: string, data: { name: string; brand?: string; }) => {
    const modelExists = await prisma.equipmentModel.findFirst({
        where: { id, tenantId }
    });

    if (!modelExists) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    // Se o nome estiver sendo alterado, verifica se não vai colidir com um existente no mesmo tenant
    if (data.name && data.name !== modelExists.name) {
        const nameConflict = await prisma.equipmentModel.findUnique({
            where: {
                name_tenantId: {
                    name: data.name,
                    tenantId
                }
            }
        });

        if (nameConflict) {
            throw new AppError('Já existe um modelo de equipamento com este nome', 409);
        }
    }

    const updatedModel = await prisma.equipmentModel.update({
        where: { id, tenantId },
        data: {
            name: data.name,
            brand: data.brand
        }
    });

    return updatedModel;
};