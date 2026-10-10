import { prisma } from "../libs/prisma";
import { AppError } from "../errors/AppError";

type CreateSupplierData = {
    name: string;
    document?: string;
    email?: string;
    phone?: string;
};

export const createSupplier = async (data: CreateSupplierData, tenantId: string) => {
    return await prisma.supplier.create({
        data: {
            ...data,
            tenantId
        }
    });
};

export const getAllSuppliers = async (tenantId: string, includeInactive = false) => {
    return await prisma.supplier.findMany({
        where: {
            tenantId,
            ...(includeInactive ? {} : { active: true })
        },
        orderBy: { name: 'asc' }
    });
};

export const getSupplierById = async (id: string, tenantId: string) => {
    return await prisma.supplier.findFirst({
        where: { id, tenantId }
    });
};

export const updateSupplier = async (
    id: string,
    tenantId: string,
    data: Partial<CreateSupplierData & { active: boolean; }>
) => {
    const supplierExists = await prisma.supplier.findFirst({
        where: { id, tenantId }
    });
    if (!supplierExists) {
        throw new AppError("Fornecedor não encontrado.", 404);
    }

    const { tenantId: _, ...safeData } = data as any;

    return await prisma.supplier.update({
        where: { id, tenantId },
        data: safeData
    });
};

export const deleteSupplier = async (id: string, tenantId: string) => {
    const supplierExists = await prisma.supplier.findFirst({
        where: { id, tenantId }
    });
    if (!supplierExists) {
        throw new AppError("Fornecedor não encontrado.", 404);
    }

    return await prisma.supplier.update({
        where: { id, tenantId },
        data: { active: false }
    });
};