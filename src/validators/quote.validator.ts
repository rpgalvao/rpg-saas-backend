import z from "zod";

const quoteItemSchema = z.object({
    type: z.enum(['PRODUCT', 'SERVICE'], {
        message: 'Tipo deve ser PRODUCT ou SERVICE',
    }),
    description: z.string().min(1, 'A descrição do item é obrigatória'),
    quantity: z.number().positive('A quantidade deve ser maior que zero'),
    unitPrice: z.number().nonnegative('O preço unitário não pode ser negativo'),
});

export const createQuoteSchema = z.object({
    dealId: z.uuid('ID da oportunidade inválido'),
    customerId: z.uuid('ID do cliente inválido'),
    validUntil: z.coerce.date().optional().nullable(),
    notes: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED']).optional(),
    items: z.array(quoteItemSchema).default([]),
});

export const dealIdParamSchema = z.object({
    dealId: z.uuid('ID da oportunidade inválido'),
});

export const quoteIdSchema = z.object({
    id: z.uuid('ID do orçamento inválido'),
});

export const quoteItemParamsSchema = z.object({
    quoteId: z.uuid('ID do orçamento inválido'),
    itemId: z.uuid('ID do item inválido'),
});

export const updateQuoteStatusSchema = z.object({
    status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED'], {
        message: 'Status deve ser DRAFT, SENT, APPROVED ou REJECTED',
    }),
});

export const createQuoteItemSchema = quoteItemSchema;

export const updateQuoteItemSchema = z.object({
    type: z.enum(['PRODUCT', 'SERVICE'], {
        message: 'Tipo deve ser PRODUCT ou SERVICE',
    }).optional(),
    description: z.string().min(1, 'A descrição do item é obrigatória').optional(),
    quantity: z.number().positive('A quantidade deve ser maior que zero').optional(),
    unitPrice: z.number().nonnegative('O preço unitário não pode ser negativo').optional(),
}).refine(
    (data) =>
        data.type !== undefined ||
        data.description !== undefined ||
        data.quantity !== undefined ||
        data.unitPrice !== undefined,
    { message: 'Informe ao menos um campo para atualizar' },
);
