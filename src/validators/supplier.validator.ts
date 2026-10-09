import z from "zod";

export const createSupplierSchema = z.object({
    name: z.string().min(3, "O nome do fornecedor precisa ter pelo menos 3 letras"),
    document: z.string().optional(),
    email: z.email("Formato de e-mail inválido").optional().or(z.literal('')),
    phone: z.string().optional()
});

export const updateSupplierSchema = z.object({
    name: z.string().min(3).optional(),
    document: z.string().optional(),
    email: z.email().optional().or(z.literal('')),
    phone: z.string().optional(),
    active: z.boolean().optional()
});