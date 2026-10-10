import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";
import { getCustomerById } from "./customer.service";

export const createEquipment = async (
    data: Omit<Prisma.EquipmentUncheckedCreateInput, 'tenantId'>,
    tenantId: string
) => {
    if (data.customerId) {
        const customer = await prisma.customer.findFirst({
            where: { id: data.customerId, tenantId }
        });
        if (!customer) throw new AppError('Cliente não encontrado', 404);
    }

    // 🛡️ Valida se o modelo de equipamento existe e está ativo no mesmo tenant
    const model = await prisma.equipmentModel.findFirst({
        where: { id: data.modelId, tenantId }
    });
    if (!model || !model.active) {
        throw new AppError('Modelo de equipamento não encontrado ou está inativo', 404);
    }

    const serialExists = await prisma.equipment.findUnique({
        where: {
            serial_number_tenantId: {
                serial_number: data.serial_number,
                tenantId
            }
        }
    });
    if (serialExists) throw new AppError('Número de série já cadastrado no sistema', 400);

    const equipment = await prisma.equipment.create({
        data: {
            ...data,
            tenantId
        }
    });

    return equipment;
};

export type EquipmentFilters = {
    status?: 'EM_ANALISE' | 'REPARO' | 'FINALIZADO';
    customerId?: string;
};

export const listEquipments = async (tenantId: string, filter: EquipmentFilters = {}) => {
    if (filter.customerId) {
        const customer = await getCustomerById(filter.customerId, tenantId);
        if (!customer) throw new AppError('Cliente informado não encontrado', 404);
    }
    const equipments = await prisma.equipment.findMany({
        where: {
            tenantId,
            active: true,
            status: filter.status,
            customerId: filter.customerId
        },
        orderBy: { model: { name: 'asc' } },
        include: {
            model: { select: { id: true, name: true } },
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

export const getEquipmentById = async (id: string, tenantId: string) => {
    const equipment = await prisma.equipment.findFirst({
        where: {
            id,
            tenantId,
            active: true
        },
        include: {
            model: { select: { id: true, name: true } },
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

export const getEquipmentBySerialNumber = async (serial_number: string, tenantId: string) => {
    const equipment = await prisma.equipment.findFirst({
        where: {
            serial_number,
            tenantId,
            active: true
        },
        include: {
            model: { select: { id: true, name: true } },
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

export const updateEquipment = async (
    id: string,
    tenantId: string,
    data: Prisma.EquipmentUncheckedUpdateInput
) => {
    try {
        const updateData: any = { ...data };

        if (updateData.status === 'FINALIZADO') {
            updateData.returned_at = new Date();
        }

        // Se estiver tentando alterar o modelo, valida se ele existe no mesmo tenant
        if (updateData.modelId) {
            const modelIdToUpdate = typeof updateData.modelId === 'string'
                ? updateData.modelId
                : updateData.modelId.set;

            if (modelIdToUpdate) {
                const model = await prisma.equipmentModel.findFirst({
                    where: { id: modelIdToUpdate, tenantId }
                });
                if (!model || !model.active) {
                    throw new AppError('Modelo de equipamento não encontrado ou está inativo', 404);
                }
            }
        }

        // Se estiver tentando alterar o cliente, valida se pertence ao mesmo tenant
        if (updateData.customerId) {
            const customerIdToUpdate = typeof updateData.customerId === 'string'
                ? updateData.customerId
                : updateData.customerId.set;

            if (customerIdToUpdate) {
                const customer = await prisma.customer.findFirst({
                    where: { id: customerIdToUpdate, tenantId }
                });
                if (!customer) {
                    throw new AppError('Cliente não encontrado', 404);
                }
            }
        }

        // Se estiver alterando o número de série, verifica conflito no mesmo tenant
        if (updateData.serial_number) {
            const serialToUpdate = typeof updateData.serial_number === 'string'
                ? updateData.serial_number
                : updateData.serial_number.set;

            if (serialToUpdate) {
                const serialConflict = await prisma.equipment.findUnique({
                    where: {
                        serial_number_tenantId: {
                            serial_number: serialToUpdate,
                            tenantId
                        }
                    }
                });

                if (serialConflict && serialConflict.id !== id) {
                    throw new AppError('Número de série já cadastrado no sistema', 400);
                }
            }
        }

        // Garantir que tenantId não seja sobrescrito
        delete updateData.tenantId;

        const updatedEquipment = await prisma.equipment.update({
            where: { id, tenantId },
            data: updateData
        });
        return updatedEquipment;
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Equipamento não encontrado', 404);
        if (error.code === 'P2002') throw new AppError('Número de série já cadastrado no sistema', 400);
        throw error;
    }
};

export const removeEquipment = async (id: string, tenantId: string) => {
    try {
        await prisma.equipment.update({
            where: { id, tenantId },
            data: { active: false }
        });
        return { message: 'Equipamento removido com sucesso' };
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Equipamento não localizado', 404);
        throw error;
    }
};