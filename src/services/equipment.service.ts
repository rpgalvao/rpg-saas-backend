import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";
import { getCustomerById } from "./customer.service";

export const createEquipment = async (data: Prisma.EquipmentUncheckedCreateInput) => {
    if (data.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) throw new AppError('Cliente não encontrado', 404);
    }

    // 🛡️ NOVO: Valida se o modelo de equipamento existe e está ativo
    const model = await prisma.equipmentModel.findUnique({ where: { id: data.modelId } });
    if (!model || !model.active) {
        throw new AppError('Modelo de equipamento não encontrado ou está inativo', 404);
    }

    const serialExists = await prisma.equipment.findUnique({ where: { serial_number: data.serial_number } });
    if (serialExists) throw new AppError('Número de série já cadastrado no sistema', 400);

    const equipment = await prisma.equipment.create({ data });

    return equipment;
};

export type EquipmentFilters = {
    status?: 'EM_ANALISE' | 'REPARO' | 'FINALIZADO';
    customerId?: string;
};

export const listEquipments = async (filter: EquipmentFilters = {}) => {
    if (filter.customerId) {
        const customer = await getCustomerById(filter.customerId);
        if (!customer) throw new AppError('Cliente informado não encontrado', 404);
    }
    const equipments = await prisma.equipment.findMany({
        where: {
            active: true,
            status: filter.status,
            customerId: filter.customerId
        },
        orderBy: { model: { name: 'asc' } }, // <-- ALTERADO: Ordena pelo nome do modelo relacionado
        include: {
            model: { select: { id: true, name: true } }, // <-- NOVO: Traz os dados do modelo
            customer: {
                select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true
                }
            }
        }
    });
    return equipments;
};

export const getEquipmentById = async (id: string) => {
    const equipment = await prisma.equipment.findUnique({
        where: {
            id,
            AND: { active: true }
        },
        include: {
            model: { select: { id: true, name: true } }, // <-- NOVO
            customer: {
                select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true
                }
            }
        }
    });
    if (!equipment) throw new AppError('Equipamento não localizado', 404);
    return equipment;
};

export const getEquipmentBySerialNumber = async (serial_number: string) => {
    const equipment = await prisma.equipment.findFirst({
        where: {
            serial_number,
            AND: { active: true }
        },
        include: {
            model: { select: { id: true, name: true } }, // <-- NOVO
            customer: {
                select: {
                    id: true,
                    name: true,
                    city: true,
                    state: true
                }
            }
        }
    });
    if (!equipment) throw new AppError('Equipamento não localizado pelo número de série', 404);
    return equipment;
};

export const updateEquipment = async (id: string, data: Prisma.EquipmentUncheckedUpdateInput) => {
    try {
        if (data.status === 'FINALIZADO') {
            data.returned_at = new Date();
        }

        // Se estiver tentando alterar o modelo, valida se ele existe
        if (data.modelId) {
            // Extrai o ID seja ele uma string direta ou um objeto { set: string }
            const modelIdToUpdate = typeof data.modelId === 'string' ? data.modelId : data.modelId.set;

            if (modelIdToUpdate) {
                const model = await prisma.equipmentModel.findUnique({ where: { id: modelIdToUpdate } });
                if (!model || !model.active) {
                    throw new AppError('Modelo de equipamento não encontrado ou está inativo', 404);
                }
            }
        }

        const updatedEquipment = await prisma.equipment.update({
            where: { id },
            data
        });
        return updatedEquipment;
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Equipamento não encontrado', 404);
        if (error.code === 'P2002') throw new AppError('Número de série já cadastrado no sistema', 400);
        throw error;
    }
};

export const removeEquipment = async (id: string) => {
    try {
        await prisma.equipment.update({
            where: { id },
            data: { active: false }
        });
        return { message: 'Equipamento removido com sucesso' };
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Equipamento não localizado', 404);
        throw error;
    }
};