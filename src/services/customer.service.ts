import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

export const createCustomer = async (data: Prisma.CustomerCreateInput) => {
    const customer = await prisma.customer.create({ data });
    if (!customer) throw new AppError('Não foi possível criar o cliente', 400);
    return customer;
};

export const getCustomersList = async () => {
    const customers = await prisma.customer.findMany({ where: { active: true }, orderBy: { created_at: 'desc' } });
    return customers;
};

export const getCustomerById = async (id: string) => {
    const customer = await prisma.customer.findUnique({
        where: {
            id, AND: {
                active: true
            }
        },
        include: {
            equipments: {
                select: {
                    serial_number: true
                }
            },
            serviceOrders: true,
        }
    });
    if (!customer) throw new AppError('Cliente não encontrado', 404);
    return customer;
};

export const updateCustomer = async (id: string, data: Prisma.CustomerUpdateInput) => {
    try {
        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data
        });
        return updatedCustomer;
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new AppError('Cliente não encontrado', 404);
        }
        throw error;
    }
};

export const deleteCustomer = async (id: string) => {
    try {
        await prisma.customer.update({ where: { id }, data: { active: false } });
        return { message: 'Cliente excluído com sucesso!' };
    } catch (error: any) {
        if (error.code === 'P2025') {
            throw new AppError('Cliente não encontrado', 404);
        }
        throw error;
    }
};