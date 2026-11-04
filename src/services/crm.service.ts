import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

const DEFAULT_STAGES = [
    { name: 'Contato Inicial', order: 1 },
    { name: 'Em Negociação', order: 2 },
    { name: 'Aprovado', order: 3 },
] as const;

type CreateDealData = {
    title: string;
    stageId: string;
    customerId?: string | null;
    estimatedValue?: number;
    description?: string;
};

const ensureDefaultStages = async (tenantId: string) => {
    const existingCount = await prisma.dealStage.count({
        where: { tenantId },
    });

    if (existingCount > 0) return;

    await prisma.dealStage.createMany({
        data: DEFAULT_STAGES.map((stage) => ({
            ...stage,
            tenantId,
        })),
    });
};

const getPipelineStages = async (tenantId: string) => {
    return prisma.dealStage.findMany({
        where: { tenantId },
        orderBy: { order: 'asc' },
        include: {
            deals: {
                where: { status: 'OPEN' },
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            mobilePhone: true,
                            customerType: true,
                            leadSource: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
            },
        },
    });
};

export const getPipeline = async (tenantId: string) => {
    await ensureDefaultStages(tenantId);
    return getPipelineStages(tenantId);
};

export const createDeal = async (tenantId: string, data: CreateDealData) => {
    const stage = await prisma.dealStage.findFirst({
        where: { id: data.stageId, tenantId },
    });

    if (!stage) {
        throw new AppError('Estágio não encontrado', 404);
    }

    if (data.customerId) {
        const customer = await prisma.customer.findFirst({
            where: { id: data.customerId, tenantId, active: true },
        });

        if (!customer) {
            throw new AppError('Cliente não encontrado', 404);
        }
    }

    return prisma.deal.create({
        data: {
            title: data.title,
            description: data.description,
            estimatedValue: data.estimatedValue ?? 0,
            stageId: data.stageId,
            customerId: data.customerId ?? null,
            tenantId,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    mobilePhone: true,
                    customerType: true,
                    leadSource: true,
                },
            },
            stage: true,
        },
    });
};

export const moveDeal = async (tenantId: string, dealId: string, newStageId: string) => {
    const deal = await prisma.deal.findFirst({
        where: { id: dealId, tenantId },
    });

    if (!deal) {
        throw new AppError('Oportunidade não encontrada', 404);
    }

    const stage = await prisma.dealStage.findFirst({
        where: { id: newStageId, tenantId },
    });

    if (!stage) {
        throw new AppError('Estágio não encontrado', 404);
    }

    return prisma.deal.update({
        where: { id: dealId },
        data: { stageId: newStageId },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    mobilePhone: true,
                    customerType: true,
                    leadSource: true,
                },
            },
            stage: true,
        },
    });
};

export const updateDealStatus = async (
    tenantId: string,
    dealId: string,
    status: 'WON' | 'LOST'
) => {
    const deal = await prisma.deal.findFirst({
        where: { id: dealId, tenantId },
    });

    if (!deal) {
        throw new AppError('Oportunidade não encontrada', 404);
    }

    return prisma.deal.update({
        where: { id: dealId },
        data: { status },
        include: {
            customer: {
                select: {
                    id: true,
                    name: true,
                    mobilePhone: true,
                    customerType: true,
                    leadSource: true,
                },
            },
            stage: true,
        },
    });
};
