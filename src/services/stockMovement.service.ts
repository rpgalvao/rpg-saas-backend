import { prisma } from "../libs/prisma";
import { AppError } from "../errors/AppError";

type CreateMovementData = {
    partId: string;
    type: "IN" | "OUT";
    quantity: number;
    reason: string;
    userId?: string | null;
    serviceOrderId?: string | null;
    unit_cost?: number;
};

export const createMovement = async (data: CreateMovementData) => {
    const part = await prisma.part.findUnique({ where: { id: data.partId } });
    if (!part) {
        throw new AppError("Peça não encontrada.", 404);
    }

    if (data.type === 'OUT' && part.current_stock < data.quantity) {
        throw new AppError(`Estoque insuficiente. Saldo atual: ${part.current_stock}`, 400);
    }

    // 1. Separamos o unit_cost do restante dos dados do movimento
    const { unit_cost, ...movementData } = data;

    // 2. Preparamos os dados de atualização da peça
    const partUpdateData: any = {
        current_stock: data.type === 'IN'
            ? part.current_stock + data.quantity
            : part.current_stock - data.quantity
    };

    // 3. Se for uma entrada (IN) e o usuário informou um novo custo, nós atualizamos!
    if (data.type === 'IN' && unit_cost !== undefined) {
        partUpdateData.cost_price = unit_cost;
    }

    const [movement, updatedPart] = await prisma.$transaction([
        prisma.stockMovement.create({ data: movementData }),
        prisma.part.update({
            where: { id: data.partId },
            data: partUpdateData
        })
    ]);

    return { movement, updatedPart };
};

export const getAllMovements = async (partId?: string) => {
    return await prisma.stockMovement.findMany({
        where: partId ? { partId } : undefined,
        include: { part: true },
        orderBy: { created_at: 'desc' }
    });
};