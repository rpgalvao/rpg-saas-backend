import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

export const createEquipmentModel = async (data: { name: string; }) => {
    const modelExists = await prisma.equipmentModel.findUnique({
        where: { name: data.name }
    });

    if (modelExists) {
        throw new AppError('Já existe um modelo de equipamento com este nome', 409);
    }

    const newModel = await prisma.equipmentModel.create({
        data
    });

    return newModel;
};

export const listAllEquipmentModels = async (includeInactive: boolean = false) => {
    const models = await prisma.equipmentModel.findMany({
        // Se includeInactive for true, não filtra por active. Se for false, traz só os ativos.
        where: includeInactive ? undefined : { active: true },
        orderBy: { name: 'asc' }
    });
    return models;
};

export const getEquipmentModelById = async (id: string) => {
    const model = await prisma.equipmentModel.findUnique({
        where: { id, active: true }
    });

    if (!model) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    return model;
};

export const toggleEquipmentModelStatus = async (id: string) => {
    const model = await prisma.equipmentModel.findUnique({
        where: { id }
    });

    if (!model) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    const updatedModel = await prisma.equipmentModel.update({
        where: { id },
        data: { active: !model.active } // Inverte o valor atual
    });

    return updatedModel;
};

export const updateEquipmentModel = async (id: string, data: { name: string; }) => {
    const modelExists = await prisma.equipmentModel.findUnique({
        where: { id }
    });

    if (!modelExists) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    // Se o nome estiver sendo alterado, verifica se não vai colidir com um existente
    if (data.name && data.name !== modelExists.name) {
        const nameConflict = await prisma.equipmentModel.findUnique({
            where: { name: data.name }
        });

        if (nameConflict) {
            throw new AppError('Já existe um modelo de equipamento com este nome', 409);
        }
    }

    const updatedModel = await prisma.equipmentModel.update({
        where: { id },
        data
    });

    return updatedModel;
};