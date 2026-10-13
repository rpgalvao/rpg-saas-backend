import z from "zod";

export const updateTenantSchema = z.object({
    name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres').optional(),
    cnpj: z.string()
        .trim()
        .refine((value) => value.replace(/\D/g, '').length === 14, 'CNPJ inválido')
        .optional(),
    phone: z.string().optional(),
    email: z.email('E-mail informado é inválido').optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
