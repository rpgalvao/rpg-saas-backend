import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

// ==========================================
// 1. GERENCIAMENTO DO TEMPLATE (Cabeçalho)
// ==========================================

export const createTemplate = async (data: { name: string, modelId: string; }) => {
    // Verifica se o modelo de equipamento existe no catálogo
    const modelExists = await prisma.equipmentModel.findUnique({
        where: { id: data.modelId }
    });

    if (!modelExists || !modelExists.active) {
        throw new AppError('Modelo de equipamento não encontrado', 404);
    }

    // Evita templates duplicados com o mesmo nome para o mesmo modelo
    const templateExists = await prisma.checklistTemplate.findFirst({
        where: { name: data.name, modelId: data.modelId }
    });

    if (templateExists) {
        throw new AppError('Já existe um template com este nome para este modelo', 409);
    }

    const newTemplate = await prisma.checklistTemplate.create({
        data
    });

    return newTemplate;
};

export const listAllTemplates = async (includeInactive: boolean = false) => {
    const checklistTemplates = await prisma.checklistTemplate.findMany({
        where: includeInactive ? undefined : { active: true },
        include: {
            questions: {
                orderBy: { order: 'asc' }
            },
            model: true
        }
    });

    if (!checklistTemplates) throw new AppError('Nenhum gabarito foi encontrado', 404);

    return checklistTemplates;
};

export const getTemplateById = async (id: string) => {
    const template = await prisma.checklistTemplate.findUnique({
        where: { id, active: true },
        include: {
            // O pulo do gato: já trazemos as perguntas ordenadas para o Frontend!
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

export const updateTemplate = async (id: string, data: { name?: string, modelId?: string; }) => {
    const template = await prisma.checklistTemplate.findUnique({ where: { id } });
    if (!template) throw new AppError('Template não encontrado', 404);

    if (data.name && data.modelId) {
        const templateExists = await prisma.checklistTemplate.findFirst({
            where: { name: data.name, modelId: data.modelId, id: { not: id } }
        });
        if (templateExists) throw new AppError('Já existe um template com este nome para este modelo', 409);
    }

    return await prisma.checklistTemplate.update({
        where: { id },
        data
    });
};

// ==========================================
// 2. GERENCIAMENTO DAS PERGUNTAS
// ==========================================

export const addQuestionToTemplate = async (templateId: string, data: { text: string, order: number; }) => {
    // Garante que o template onde vamos plugar a pergunta existe
    const templateExists = await prisma.checklistTemplate.findUnique({
        where: { id: templateId }
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

export const updateQuestion = async (questionId: string, data: { text?: string, order?: number; }) => {
    const question = await prisma.checklistQuestion.findUnique({ where: { id: questionId } });
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

export const toggleTemplateStatus = async (id: string) => {
    const template = await prisma.checklistTemplate.findUnique({
        where: { id }
    });

    if (!template) {
        throw new AppError('Template de checklist não encontrado', 404);
    }

    const updatedTemplate = await prisma.checklistTemplate.update({
        where: { id },
        data: { active: !template.active }
    });

    return updatedTemplate;
};

export const deleteQuestion = async (questionId: string) => {
    const question = await prisma.checklistQuestion.findUnique({
        where: { id: questionId }
    });

    if (!question) {
        throw new AppError('Pergunta não encontrada', 404);
    }

    await prisma.checklistQuestion.delete({
        where: { id: questionId }
    });

    return { message: "Pergunta removida com sucesso" };
};