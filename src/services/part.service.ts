import { prisma } from "../libs/prisma";
import { AppError } from "../errors/AppError";

type CreatePartData = {
    name: string;
    sku?: string;
    cost_price: number;
    sale_price: number;
    current_stock?: number;
    min_stock?: number;
    supplierId?: string | null;
};

export const createPart = async (data: CreatePartData, tenantId: string) => {
    // 🛡️ Verifica se o fornecedor existe no MESMO tenant antes de criar a peça
    if (data.supplierId) {
        const supplierExists = await prisma.supplier.findFirst({
            where: { id: data.supplierId, tenantId }
        });

        if (!supplierExists) {
            throw new AppError("Fornecedor não encontrado.", 404);
        }
    }

    return await prisma.part.create({
        data: {
            name: data.name,
            sku: data.sku,
            cost_price: data.cost_price,
            sale_price: data.sale_price,
            current_stock: data.current_stock ?? 0,
            min_stock: data.min_stock ?? 0,
            supplierId: data.supplierId,
            tenantId
        }
    });
};

export const getAllParts = async (tenantId: string, includeInactive = false) => {
    return await prisma.part.findMany({
        where: {
            tenantId,
            ...(includeInactive ? {} : { active: true })
        },
        include: { supplier: true },
        orderBy: { name: 'asc' }
    });
};

export const getPartById = async (id: string, tenantId: string) => {
    return await prisma.part.findFirst({
        where: { id, tenantId },
        include: { supplier: true }
    });
};

export const updatePart = async (
    id: string,
    tenantId: string,
    data: Partial<CreatePartData & { active: boolean; }>
) => {
    // Verifica se a peça existe no mesmo tenant
    const partExists = await prisma.part.findFirst({
        where: { id, tenantId }
    });
    if (!partExists) {
        throw new AppError("Peça não encontrada.", 404);
    }

    // 🛡️ Verifica se o novo fornecedor (caso seja alterado) pertence ao mesmo tenant
    if (data.supplierId) {
        const supplierExists = await prisma.supplier.findFirst({
            where: { id: data.supplierId, tenantId }
        });

        if (!supplierExists) {
            throw new AppError("Fornecedor não encontrado.", 404);
        }
    }

    const { tenantId: _, ...safeData } = data as any;

    return await prisma.part.update({
        where: { id, tenantId },
        data: safeData
    });
};

export const deletePart = async (id: string, tenantId: string) => {
    const partExists = await prisma.part.findFirst({
        where: { id, tenantId }
    });
    if (!partExists) {
        throw new AppError("Peça não encontrada.", 404);
    }

    return await prisma.part.update({
        where: { id, tenantId },
        data: { active: false }
    });
};

export const getLowStockParts = async (tenantId: string) => {
    // Busca as peças ativas do tenant
    const parts = await prisma.part.findMany({
        where: {
            tenantId,
            active: true
        },
        include: { supplier: true },
        orderBy: { name: 'asc' }
    });

    // Retorna apenas as que o estoque atual bateu no limite ou passou para baixo
    return parts.filter((part: any) => part.current_stock <= part.min_stock);
};