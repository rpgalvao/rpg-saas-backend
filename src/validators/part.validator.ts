import z from "zod";

export const createPartSchema = z.object({
    name: z.string().min(2, "O nome da peça precisa ter pelo menos 2 caracteres"),
    sku: z.string().optional(),
    cost_price: z.coerce.number().min(0, "O preço de custo não pode ser negativo"),
    sale_price: z.coerce.number().min(0, "O preço de venda não pode ser negativo"),
    current_stock: z.coerce.number().int().min(0).default(0),
    min_stock: z.coerce.number().int().min(0).default(0),
    supplierId: z.string().uuid("ID do fornecedor inválido").optional().nullable()
});

export const updatePartSchema = z.object({
    name: z.string().min(2).optional(),
    sku: z.string().optional(),
    cost_price: z.coerce.number().min(0).optional(),
    sale_price: z.coerce.number().min(0).optional(),
    current_stock: z.coerce.number().int().min(0).optional(),
    min_stock: z.coerce.number().int().min(0).optional(),
    supplierId: z.string().uuid().optional().nullable(),
    active: z.boolean().optional()
});