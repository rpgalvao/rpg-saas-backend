import z from "zod";

export const createMasterTenantSchema = z.object({
    name: z.string().trim().min(2, 'O nome deve conter pelo menos 2 caracteres'),
    tradeName: z.string().trim().min(2, 'O nome fantasia deve conter pelo menos 2 caracteres').optional(),
    cnpj: z.string()
        .trim()
        .refine((value) => value.replace(/\D/g, '').length === 14, 'CNPJ inválido')
        .optional(),
    admin: z.object({
        name: z.string().trim().min(2, 'O nome do administrador deve conter pelo menos 2 caracteres'),
        email: z.email('E-mail informado é inválido'),
        password: z.string().min(5, 'A senha deve conter pelo menos 5 caracteres'),
    }),
});

export const tenantIdParamSchema = z.object({
    id: z.uuid('Identificador da empresa inválido'),
});

export type CreateMasterTenantInput = z.infer<typeof createMasterTenantSchema>;
