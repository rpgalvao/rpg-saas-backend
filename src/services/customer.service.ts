import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

export const createCustomer = async (
    data: Omit<Prisma.CustomerUncheckedCreateInput, 'tenantId'>,
    tenantId: string
) => {
    const customer = await prisma.customer.create({
        data: {
            ...data,
            tenantId
        }
    });

    if (!customer) throw new AppError('Não foi possível criar o cliente', 400);
    return customer;
};

export const getCustomersList = async (tenantId: string) => {
    const customers = await prisma.customer.findMany({
        where: {
            tenantId,
            active: true
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    return customers;
};

export const getCustomerById = async (id: string, tenantId: string) => {
    const customer = await prisma.customer.findFirst({
        where: {
            id,
            tenantId,
            active: true
        },
        include: {
            equipments: {
                where: { tenantId },
                select: {
                    serial_number: true
                }
            },
            serviceOrders: {
                where: { tenantId }
            }
        }
    });

    if (!customer) throw new AppError('Cliente não encontrado', 404);
    return customer;
};

export const updateCustomer = async (
    id: string,
    tenantId: string,
    data: Prisma.CustomerUpdateInput
) => {
    try {
        const { tenantId: _, ...safeData } = data as Record<string, any>;
        const updatedCustomer = await prisma.customer.update({
            where: {
                id,
                tenantId
            },
            data: safeData
        });

        return updatedCustomer;
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new AppError('Cliente não encontrado', 404);
        }
        throw error;
    }
};

export const deleteCustomer = async (id: string, tenantId: string) => {
    try {
        await prisma.customer.update({
            where: {
                id,
                tenantId
            },
            data: {
                active: false
            }
        });

        return { message: 'Cliente excluído com sucesso!' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new AppError('Cliente não encontrado', 404);
        }
        throw error;
    }
};