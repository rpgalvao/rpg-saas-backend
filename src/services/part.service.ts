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

export const createPart = async (data: CreatePartData) => {
    // 🛡️ NOVA TRAVA: Verifica se o fornecedor existe antes de criar a peça
    if (data.supplierId) {
        const supplierExists = await prisma.supplier.findUnique({
            where: { id: data.supplierId }
        });

        if (!supplierExists) {
            throw new AppError("Fornecedor não encontrado.", 404);
        }
    }

    return await prisma.part.create({ data });
};

export const getAllParts = async (includeInactive = false) => {
    return await prisma.part.findMany({
        where: includeInactive ? undefined : { active: true },
        include: { supplier: true },
        orderBy: { name: 'asc' }
    });
};

export const getPartById = async (id: string) => {
    return await prisma.part.findUnique({
        where: { id },
        include: { supplier: true }
    });
};

export const updatePart = async (id: string, data: Partial<CreatePartData & { active: boolean; }>) => {
    // Verifica se a peça existe
    const partExists = await prisma.part.findUnique({ where: { id } });
    if (!partExists) {
        throw new AppError("Peça não encontrada.", 404);
    }

    // 🛡️ NOVA TRAVA: Verifica se o novo fornecedor (caso seja alterado) existe
    if (data.supplierId) {
        const supplierExists = await prisma.supplier.findUnique({
            where: { id: data.supplierId }
        });

        if (!supplierExists) {
            throw new AppError("Fornecedor não encontrado.", 404);
        }
    }

    return await prisma.part.update({
        where: { id },
        data
    });
};

export const deletePart = async (id: string) => {
    const partExists = await prisma.part.findUnique({ where: { id } });
    if (!partExists) {
        throw new AppError("Peça não encontrada.", 404);
    }

    return await prisma.part.update({
        where: { id },
        data: { active: false }
    });
};

export const getLowStockParts = async () => {
    // Busca as peças ativas
    const parts = await prisma.part.findMany({
        where: { active: true },
        include: { supplier: true }, // Traz o fornecedor para o cliente já saber de quem comprar!
        orderBy: { name: 'asc' }
    });

    // A regra de negócio: Retorna apenas as que o estoque atual bateu no limite ou passou para baixo
    return parts.filter((part: any) => part.current_stock <= part.min_stock);
};