import z from "zod";

export const openServiceOrderSchema = z.object({
    customerId: z.uuid(),
    equipmentId: z.uuid(),
    type: z.enum(['INSTALACAO', 'PREVENTIVA', 'CORRETIVA']),
    problem_description: z.string().min(5).max(255),
    solution_description: z.string().optional()
});

export const serviceOrderIdSchema = z.object({
    id: z.uuid()
});

export const updateServiceOrderSchema = z.object({
    customerId: z.uuid().optional(),
    equipmentId: z.uuid().optional(),
    problem_description: z.string().min(5).max(255).optional(),
    solution_description: z.string().optional(),
    technical_notes: z.string().optional(),
    client_signature: z.string().min(20, 'A assinatura do cliente está em formato inválido').optional(),
    signer_name: z.string().min(2, 'O nome do cliente precisa ter pelo menos 2 caracteres').optional(),
    status: z.enum(['ABERTA', 'FINALIZADA', 'CANCELADA']).optional(),
    cancellation_reason: z.string().optional(),
    labor_cost: z.coerce.number().min(0, 'O valor não pode ser negativo.').optional(),
    travel_cost: z.coerce.number().min(0, 'O valor não pode ser negativo.').optional(),
    accommodation_cost: z.coerce.number().min(0, 'O valor não pode ser negativo.').optional()
});

export const cancelServiceOrderSchema = z.object({
    reason: z.string('Necessário informar o motivo do cancelamento')
});

export const updateChecklistSchema = z.object({
    notes: z.string().optional(),
    answers: z.array(z.object({
        id: z.uuid('ID da resposta inválido'),
        is_ok: z.boolean(),
        comment: z.string().optional()
    }))
});

export const addPartToOsSchema = z.object({
    partId: z.uuid("ID da peça inválido"),
    quantity: z.coerce.number().int().positive("A quantidade deve ser maior que zero")
});

export const signatureSchema = z.object({
    signature: z.string().min(20, 'A string da assinatura em Base64 é inválida ou muito curta.')
});

export const emailSchema = z.object({
    customEmail: z.email('E-mail inválido').optional()
});

export const reopenServiceOrderSchema = z.object({
    reason: z.string().min(5, 'O motivo da reabertura deve ter no mínimo 5 caracteres e é obrigatório.')
});

export const uploadOsImageSchema = z.object({
    tag: z.enum(['ANTES', 'DURANTE', 'DEPOIS'])
});

export const removeImageSchema = z.object({
    imageId: z.uuid()
});