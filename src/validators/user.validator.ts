import z from "zod";

export const createUserSchema = z.object({
    name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres'),
    email: z.email('E-mail informado é inválido'),
    password: z.string().min(5, 'A senha deve conter pelo menos 5 caracteres'),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'TECHNICIAN']).optional()
});

export const getUserByIdSchema = z.object({
    id: z.uuid()
});

export const updateUserSchema = z.object({
    name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres').optional(),
    email: z.email('E-mail informado é inválido').optional(),
    phone: z.string().optional(),
    signature_url: z.string().optional(),
    avatar_url: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(5, 'A nova senha deve conter pelo menos 5 caracteres').optional(),
    role: z.enum(['ADMIN', 'TECHNICIAN']).optional()
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;