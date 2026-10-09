import z from "zod";

export const createChecklistTemplateSchema = z.object({
    name: z.string().min(3, 'O nome do checklist deve ter pelo menos 3 caracteres'),
    modelId: z.uuid('ID do modelo inválido')
});

export const addChecklistQuestionSchema = z.object({
    text: z.string().min(5, 'A pergunta deve ter pelo menos 5 caracteres'),
    order: z.number().int().positive('A ordem deve ser um número inteiro positivo')
});

export const checklistTemplateIdSchema = z.object({
    id: z.uuid('ID do template inválido')
});

export const questionIdSchema = z.object({
    questionId: z.uuid('ID da pergunta inválido')
});

export const updateChecklistTemplateSchema = z.object({
    name: z.string().min(3, 'O nome do checklist deve ter pelo menos 3 caracteres').optional(),
    modelId: z.uuid('ID do modelo inválido').optional()
});

export const updateChecklistQuestionSchema = z.object({
    text: z.string().min(5, 'A pergunta deve ter pelo menos 5 caracteres').optional(),
    order: z.number().int().positive('A ordem deve ser um número inteiro positivo').optional()
});