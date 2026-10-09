import z from "zod";

export const createEquipmentSchema = z.object({
    customerId: z.uuid().optional(),
    modelId: z.string().uuid('ID do modelo de equipamento inválido'), // <-- ADICIONADO
    serial_number: z.string().min(2, 'O número de série do equipamento precisa ter pelo menos 2 caracteres').toUpperCase(),
    status: z.enum(['EM_ANALISE', 'REPARO', 'FINALIZADO']).optional(),
});

export const getEquipmentListSchema = z.object({
    status: z.enum(['EM_ANALISE', 'REPARO', 'FINALIZADO']).optional(),
    customerId: z.uuid().optional()
});

export const getEquipmentIdSchema = z.object({
    id: z.uuid()
});

export const getEquipmentSerialNumberSchema = z.object({
    serial_number: z.string().min(2, 'O número de série do equipamento precisa ter pelo menos 2 caracteres')
});

export const updateEquipmentSchema = z.object({
    customerId: z.uuid().optional(),
    modelId: z.string().uuid('ID do modelo de equipamento inválido').optional(), // <-- ADICIONADO
    serial_number: z.string().min(2, 'O número de série do equipamento precisa ter pelo menos 2 caracteres').toUpperCase().optional(),
    status: z.enum(['EM_ANALISE', 'REPARO', 'FINALIZADO']).optional(),
});