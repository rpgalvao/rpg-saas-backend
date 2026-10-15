import z from "zod";

export const createEquipmentModelSchema = z.object({
    name: z.string().min(2, 'O nome do equipamento deve ter pelo menos 2 caracteres'),
    brand: z.string().optional()
});

export const equipmentModelIdSchema = z.object({
    id: z.uuid('ID do equipamento inválido')
});