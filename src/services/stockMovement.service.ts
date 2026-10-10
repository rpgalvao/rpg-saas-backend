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

export const createMovement = async (
    data: CreateMovementData,
    tenantId: string,
    loggedUserId?: string
) => {
    // 🛡️ Valida se a peça pertence ao mesmo tenant
    const part = await prisma.part.findFirst({
        where: { id: data.partId, tenantId }
    });
    if (!part) {
        throw new AppError("Peça não encontrada.", 404);
    }

    // Se informou serviceOrderId, valida se a OS pertence ao mesmo tenant
    if (data.serviceOrderId) {
        const os = await prisma.serviceOrder.findFirst({
            where: { id: data.serviceOrderId, tenantId }
        });
        if (!os) {
            throw new AppError("Ordem de Serviço não encontrada.", 404);
        }
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
        prisma.stockMovement.create({
            data: {
                ...movementData,
                userId: movementData.userId || loggedUserId
            }
        }),
        prisma.part.update({
            where: { id: data.partId, tenantId },
            data: partUpdateData
        })
    ]);

    return { movement, updatedPart };
};

export const getAllMovements = async (tenantId: string, partId?: string) => {
    // 🛡️ Garante o isolamento através do relacionamento com Part (que tem tenantId)
    return await prisma.stockMovement.findMany({
        where: {
            part: {
                tenantId
            },
            ...(partId ? { partId } : {})
        },
        include: { part: true },
        orderBy: { created_at: 'desc' }
    });
};