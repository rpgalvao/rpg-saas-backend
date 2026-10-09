import z from "zod";

export const createMovementSchema = z.object({
    partId: z.uuid("ID da peça inválido"),
    type: z.enum(["IN", "OUT"]),
    quantity: z.coerce.number().int().positive("A quantidade deve ser maior que zero"),
    reason: z.string().min(3, "O motivo precisa ser informado"),
    userId: z.string().uuid().optional().nullable(),
    serviceOrderId: z.string().uuid().optional().nullable(),
    unit_cost: z.coerce.number().min(0).optional()
});