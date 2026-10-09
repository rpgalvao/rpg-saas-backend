import { prisma } from "../libs/prisma";
import { AppError } from "../errors/AppError"; // Ajuste o caminho de acordo com a sua estrutura

type CreateSupplierData = {
    name: string;
    document?: string;
    email?: string;
    phone?: string;
};

export const createSupplier = async (data: CreateSupplierData) => {
    return await prisma.supplier.create({ data });
};

export const getAllSuppliers = async (includeInactive = false) => {
    return await prisma.supplier.findMany({
        where: includeInactive ? undefined : { active: true },
        orderBy: { name: 'asc' }
    });
};

export const getSupplierById = async (id: string) => {
    return await prisma.supplier.findUnique({ where: { id } });
};

export const updateSupplier = async (id: string, data: Partial<CreateSupplierData & { active: boolean; }>) => {
    // 🛡️ A regra de negócio mora aqui!
    const supplierExists = await prisma.supplier.findUnique({ where: { id } });
    if (!supplierExists) {
        throw new AppError("Fornecedor não encontrado.", 404);
    }

    return await prisma.supplier.update({
        where: { id },
        data
    });
};

export const deleteSupplier = async (id: string) => {
    // 🛡️ A regra de negócio mora aqui!
    const supplierExists = await prisma.supplier.findUnique({ where: { id } });
    if (!supplierExists) {
        throw new AppError("Fornecedor não encontrado.", 404);
    }

    return await prisma.supplier.update({
        where: { id },
        data: { active: false }
    });
};