import z from "zod";

export const createCustomerSchema = z.object({
    name: z.string().min(2, 'O nome do cliente precisa ter pelo menos 2 caracteres'),
    city: z.string().min(2, 'O nome da cidade deve conter pelo menos 2 caracteres'),
    state: z.string().min(2).max(2),
    email: z.email().optional(),
    zipcode: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
});

export const getCustomerIdSchema = z.object({
    id: z.uuid()
});

export const updateCustomerSchema = z.object({
    name: z.string().min(2, 'O nome do cliente precisa ter pelo menos 2 caracteres').optional(),
    city: z.string().min(2, 'O nome da cidade deve conter pelo menos 2 caracteres').optional(),
    state: z.string().min(2).max(2).optional(),
    email: z.email().optional(),
    zipcode: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
});