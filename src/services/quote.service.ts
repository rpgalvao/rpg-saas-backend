import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

type QuoteItemInput = {
    type: 'PRODUCT' | 'SERVICE';
    description: string;
    quantity: number;
    unitPrice: number;
};

const QUOTE_STATUSES = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED'] as const;
type QuoteStatus = (typeof QUOTE_STATUSES)[number];

type UpdateQuoteItemData = {
    type?: QuoteItemInput['type'];
    description?: string;
    quantity?: number;
    unitPrice?: number;
};

const quoteResponseInclude = {
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
            estimatedValue: true,
        },
    },
} satisfies Prisma.QuoteInclude;

const syncQuoteTotal = async (
    tx: Prisma.TransactionClient,
    quoteId: string,
    dealId: string,
    totalAmount: number,
) => {
    const updatedQuote = await tx.quote.update({
        where: { id: quoteId },
        data: { totalAmount },
        include: quoteResponseInclude,
    });

    await tx.deal.update({
        where: { id: dealId },
        data: { estimatedValue: totalAmount },
    });

    return {
        ...updatedQuote,
        deal: {
            ...updatedQuote.deal,
            estimatedValue: totalAmount,
        },
    };
};

type CreateQuoteData = {
    dealId: string;
    customerId: string;
    validUntil?: Date | null;
    notes?: string;
    status?: QuoteStatus;
    items?: QuoteItemInput[];
};

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

    const items = data.items ?? [];
    const itemsWithTotals = items.map((item) => {
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
        const quote = await tx.quote.create({
            data: {
                tenantId,
                dealId: data.dealId,
                customerId: data.customerId,
                validUntil: data.validUntil ?? null,
                notes: data.notes,
                status: data.status ?? 'DRAFT',
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
                        estimatedValue: true,
                    },
                },
            },
        });

        await tx.deal.update({
            where: { id: quote.dealId },
            data: { estimatedValue: totalAmount },
        });

        return {
            ...quote,
            deal: {
                ...quote.deal,
                estimatedValue: totalAmount,
            },
        };
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

export const addQuoteItem = async (
    tenantId: string,
    quoteId: string,
    item: QuoteItemInput
) => {
    const quote = await prisma.quote.findFirst({
        where: { id: quoteId, tenantId },
        include: { items: true },
    });

    if (!quote) {
        throw new AppError('Orçamento não encontrado', 404);
    }

    const totalPrice = item.quantity * item.unitPrice;
    const newTotalAmount = quote.totalAmount + totalPrice;

    return prisma.$transaction(async (tx) => {
        await tx.quoteItem.create({
            data: {
                quoteId,
                type: item.type,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice,
            },
        });

        return syncQuoteTotal(tx, quoteId, quote.dealId, newTotalAmount);
    });
};

export const updateQuoteItem = async (
    tenantId: string,
    quoteId: string,
    itemId: string,
    data: UpdateQuoteItemData,
) => {
    const item = await prisma.quoteItem.findFirst({
        where: {
            id: itemId,
            quoteId,
            quote: { tenantId },
        },
        include: {
            quote: true,
        },
    });

    if (!item) {
        throw new AppError('Item do orçamento não encontrado', 404);
    }

    const quantity = data.quantity ?? item.quantity;
    const unitPrice = data.unitPrice ?? item.unitPrice;
    const totalPrice = quantity * unitPrice;

    return prisma.$transaction(async (tx) => {
        await tx.quoteItem.update({
            where: { id: itemId },
            data: {
                type: data.type ?? item.type,
                description: data.description ?? item.description,
                quantity,
                unitPrice,
                totalPrice,
            },
        });

        const items = await tx.quoteItem.findMany({
            where: { quoteId },
        });
        const newTotalAmount = items.reduce((sum, current) => sum + current.totalPrice, 0);

        return syncQuoteTotal(tx, quoteId, item.quote.dealId, newTotalAmount);
    });
};

export const deleteQuoteItem = async (
    tenantId: string,
    quoteId: string,
    itemId: string,
) => {
    const item = await prisma.quoteItem.findFirst({
        where: {
            id: itemId,
            quoteId,
            quote: { tenantId },
        },
        include: {
            quote: true,
        },
    });

    if (!item) {
        throw new AppError('Item do orçamento não encontrado', 404);
    }

    return prisma.$transaction(async (tx) => {
        await tx.quoteItem.delete({
            where: { id: itemId },
        });

        const items = await tx.quoteItem.findMany({
            where: { quoteId },
        });
        const newTotalAmount = items.reduce((sum, current) => sum + current.totalPrice, 0);

        return syncQuoteTotal(tx, quoteId, item.quote.dealId, newTotalAmount);
    });
};

export const deleteQuote = async (tenantId: string, quoteId: string) => {
    const quote = await prisma.quote.findFirst({
        where: { id: quoteId, tenantId },
    });

    if (!quote) {
        throw new AppError('Orçamento não encontrado', 404);
    }

    await prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({
            where: { quoteId },
        });

        await tx.quote.delete({
            where: { id: quoteId },
        });

        const deal = await tx.deal.findUnique({
            where: { id: quote.dealId },
            select: { estimatedValue: true },
        });

        if (!deal || deal.estimatedValue !== quote.totalAmount) {
            return;
        }

        const fallback = await tx.quote.findFirst({
            where: { tenantId, dealId: quote.dealId },
            orderBy: { id: 'desc' },
            select: { totalAmount: true },
        });

        await tx.deal.update({
            where: { id: quote.dealId },
            data: { estimatedValue: fallback?.totalAmount ?? 0 },
        });
    });
};
