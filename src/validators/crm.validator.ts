import z from "zod";

export const createDealSchema = z.object({
    title: z.string().min(1, 'O título da oportunidade é obrigatório'),
    stageId: z.uuid('ID do estágio inválido'),
    customerId: z.uuid('ID do cliente inválido').optional().nullable(),
    estimatedValue: z.number().nonnegative().optional(),
    description: z.string().optional(),
});

export const dealIdSchema = z.object({
    id: z.uuid('ID da oportunidade inválido'),
});

export const moveDealSchema = z.object({
    newStageId: z.uuid('ID do estágio inválido'),
});

export const updateDealStatusSchema = z.object({
    status: z.enum(['WON', 'LOST'], {
        message: 'Status deve ser WON ou LOST',
    }),
});
