import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

type QuoteItemInput = {
    type: 'PRODUCT' | 'SERVICE';
    description: string;
    quantity: number;
    unitPrice: number;
};

type CreateQuoteData = {
    dealId: string;
    customerId: string;
    validUntil?: Date | null;
    notes?: string;
    items: QuoteItemInput[];
};

const QUOTE_STATUSES = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED'] as const;
type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const createQuote = async (tenantId: string, data: CreateQuoteData) => {
    const deal = await prisma.deal.findFirst({
        where: { id: data.dealId, tenantId },
    });

    if (!deal) {
        throw new AppError('Oportunidade não encontrada', 404);
    }

    const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, tenantId, active: true },
    });

    if (!customer) {
        throw new AppError('Cliente não encontrado', 404);
    }

    const itemsWithTotals = data.items.map((item) => {
        const totalPrice = item.quantity * item.unitPrice;
        return {
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice,
        };
    });

    const totalAmount = itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);

    return prisma.$transaction(async (tx) => {
        return tx.quote.create({
            data: {
                tenantId,
                dealId: data.dealId,
                customerId: data.customerId,
                validUntil: data.validUntil ?? null,
                notes: data.notes,
                totalAmount,
                items: {
                    create: itemsWithTotals,
                },
            },
            include: {
                items: true,
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        mobilePhone: true,
                    },
                },
                deal: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
        });
    });
};

export const getQuotesByDeal = async (tenantId: string, dealId: string) => {
    const deal = await prisma.deal.findFirst({
        where: { id: dealId, tenantId },
    });

    if (!deal) {
        throw new AppError('Oportunidade não encontrada', 404);
    }

    return prisma.quote.findMany({
        where: { tenantId, dealId },
        include: {
            items: true,
            customer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    mobilePhone: true,
                },
            },
        },
        orderBy: { id: 'desc' },
    });
};

export const updateQuoteStatus = async (
    tenantId: string,
    quoteId: string,
    status: QuoteStatus
) => {
    const quote = await prisma.quote.findFirst({
        where: { id: quoteId, tenantId },
    });

    if (!quote) {
        throw new AppError('Orçamento não encontrado', 404);
    }

    return prisma.quote.update({
        where: { id: quoteId },
        data: { status },
        include: {
            items: true,
            customer: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    mobilePhone: true,
                },
            },
            deal: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                },
            },
        },
    });
};
