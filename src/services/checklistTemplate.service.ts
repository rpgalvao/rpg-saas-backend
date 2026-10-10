import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

// ==========================================
// 1. GERENCIAMENTO DO TEMPLATE (Cabeçalho)
// ==========================================

export const createTemplate = async (data: { name: string, modelId: string; }, tenantId: string) => {
    // Verifica se o modelo de equipamento existe no catálogo do mesmo tenant
    const modelExists = await prisma.equipmentModel.findFirst({
        where: { id: data.modelId, tenantId }
    });

    if (!modelExists || !modelExists.active) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    // Evita templates duplicados com o mesmo nome para o mesmo modelo no mesmo tenant
    const templateExists = await prisma.checklistTemplate.findFirst({
        where: { name: data.name, modelId: data.modelId, tenantId }
    });

    if (templateExists) {
        throw new AppError('Já existe um template com este nome para este modelo', 409);
    }

    const newTemplate = await prisma.checklistTemplate.create({
        data: {
            ...data,
            tenantId
        }
    });

    return newTemplate;
};

export const listAllTemplates = async (tenantId: string, includeInactive: boolean = false) => {
    const checklistTemplates = await prisma.checklistTemplate.findMany({
        where: {
            tenantId,
            ...(includeInactive ? {} : { active: true })
        },
        include: {
            questions: {
                orderBy: { order: 'asc' }
            },
            model: true
        }
    });

    return checklistTemplates;
};

export const getTemplateById = async (id: string, tenantId: string) => {
    const template = await prisma.checklistTemplate.findFirst({
        where: { id, tenantId, active: true },
        include: {
            questions: {
                orderBy: { order: 'asc' }
            }
        }
    });

    if (!template) {
        throw new AppError('Template de checklist não encontrado', 404);
    }

    return template;
};

export const updateTemplate = async (
    id: string,
    tenantId: string,
    data: { name?: string, modelId?: string; }
) => {
    const template = await prisma.checklistTemplate.findFirst({
        where: { id, tenantId }
    });
    if (!template) throw new AppError('Template não encontrado', 404);

    if (data.modelId) {
        const modelExists = await prisma.equipmentModel.findFirst({
            where: { id: data.modelId, tenantId }
        });
        if (!modelExists || !modelExists.active) {
            throw new AppError('Modelo de equipamento não encontrado', 404);
        }
    }

    const targetName = data.name || template.name;
    const targetModelId = data.modelId || template.modelId;

    if (data.name || data.modelId) {
        const templateExists = await prisma.checklistTemplate.findFirst({
            where: {
                name: targetName,
                modelId: targetModelId,
                tenantId,
                id: { not: id }
            }
        });
        if (templateExists) throw new AppError('Já existe um template com este nome para este modelo', 409);
    }

    const { tenantId: _, ...safeData } = data as any;

    return await prisma.checklistTemplate.update({
        where: { id, tenantId },
        data: safeData
    });
};

// ==========================================
// 2. GERENCIAMENTO DAS PERGUNTAS
// ==========================================

export const addQuestionToTemplate = async (
    templateId: string,
    tenantId: string,
    data: { text: string, order: number; }
) => {
    // Garante que o template onde vamos plugar a pergunta pertence ao tenant
    const templateExists = await prisma.checklistTemplate.findFirst({
        where: { id: templateId, tenantId }
    });

    if (!templateExists) {
        throw new AppError('Template de checklist não encontrado', 404);
    }

    // Impede que o Admin crie duas perguntas com a mesma posição (ex: duas perguntas "1")
    const orderInUse = await prisma.checklistQuestion.findFirst({
        where: { templateId, order: data.order }
    });

    if (orderInUse) {
        throw new AppError(`Já existe uma pergunta na posição ${data.order} para este template`, 409);
    }

    const newQuestion = await prisma.checklistQuestion.create({
        data: {
            text: data.text,
            order: data.order,
            templateId
        }
    });

    return newQuestion;
};

export const updateQuestion = async (
    questionId: string,
    tenantId: string,
    data: { text?: string, order?: number; }
) => {
    // Valida que a pergunta pertence a um template do tenant
    const question = await prisma.checklistQuestion.findFirst({
        where: {
            id: questionId,
            template: { tenantId }
        }
    });
    if (!question) throw new AppError('Pergunta não encontrada', 404);

    if (data.order && data.order !== question.order) {
        const orderInUse = await prisma.checklistQuestion.findFirst({
            where: { templateId: question.templateId, order: data.order }
        });
        if (orderInUse) throw new AppError(`A posição ${data.order} já está ocupada neste template`, 409);
    }

    return await prisma.checklistQuestion.update({
        where: { id: questionId },
        data
    });
};

// ==========================================
// 3. MANUTENÇÃO (Desativar Template e Apagar Pergunta)
// ==========================================

export const toggleTemplateStatus = async (id: string, tenantId: string) => {
    const template = await prisma.checklistTemplate.findFirst({
        where: { id, tenantId }
    });

    if (!template) {
        throw new AppError('Template de checklist não encontrado', 404);
    }

    const updatedTemplate = await prisma.checklistTemplate.update({
        where: { id, tenantId },
        data: { active: !template.active }
    });

    return updatedTemplate;
};

export const deleteQuestion = async (questionId: string, tenantId: string) => {
    // Valida que a pergunta pertence a um template do tenant antes de deletar
    const question = await prisma.checklistQuestion.findFirst({
        where: {
            id: questionId,
            template: { tenantId }
        }
    });

    if (!question) {
        throw new AppError('Pergunta não encontrada', 404);
    }

    await prisma.checklistQuestion.delete({
        where: { id: questionId }
    });

    return { message: "Pergunta removida com sucesso" };
};