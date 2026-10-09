import z from "zod";

export const loginTechnicianSchema = z.object({
    email: z.email(),
    password: z.string().min(5, 'A senha deve ter no mínimo 5 caracteres')
});

export const forgotPasswordSchema = z.object({
    email: z.email('E-mail inválido'),
});

export const resetPasswordSchema = z.object({
    token: z.string('Token é obrigatório.'),
    password: z.string().min(5, 'A nova senha deve conter pelo menos 5 caracteres.')
});