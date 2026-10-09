import { RequestHandler } from "express";
import * as ChecklistTemplateService from "../services/checklistTemplate.service";
import { createChecklistTemplateSchema, checklistTemplateIdSchema, addChecklistQuestionSchema, questionIdSchema, updateChecklistTemplateSchema, updateChecklistQuestionSchema } from "../validators/checklistTemplate.validator";
import { AppError } from "../errors/AppError";

export const createTemplate: RequestHandler = async (req, res) => {
    // 🛡️ Proteção: Apenas ADMIN cria templates
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    if (req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem criar gabaritos de checklist.', 403);
    }

    const data = createChecklistTemplateSchema.parse(req.body);
    const newTemplate = await ChecklistTemplateService.createTemplate(data);

    res.status(201).json({ success: true, data: newTemplate });
};

export const listTemplates: RequestHandler = async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const templates = await ChecklistTemplateService.listAllTemplates(includeInactive);
    res.json({ success: true, data: templates });
};

export const getTemplateById: RequestHandler = async (req, res) => {
    // Busca aberta para leitura
    const { id } = checklistTemplateIdSchema.parse(req.params);
    const template = await ChecklistTemplateService.getTemplateById(id);

    res.json({ success: true, data: template });
};

export const addQuestionToTemplate: RequestHandler = async (req, res) => {
    // 🛡️ Proteção: Apenas ADMIN adiciona perguntas
    if (!req.user) throw new AppError('Usuário não autenticado', 401);
    if (req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem adicionar perguntas ao gabarito.', 403);
    }

    const { id } = checklistTemplateIdSchema.parse(req.params);
    const data = addChecklistQuestionSchema.parse(req.body);

    const newQuestion = await ChecklistTemplateService.addQuestionToTemplate(id, data);

    res.status(201).json({ success: true, data: newQuestion });
};

export const toggleTemplateStatus: RequestHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem desativar gabaritos.', 403);
    }

    const { id } = checklistTemplateIdSchema.parse(req.params);
    const updatedTemplate = await ChecklistTemplateService.toggleTemplateStatus(id);

    res.json({ success: true, data: updatedTemplate });
};

export const deleteQuestion: RequestHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem remover perguntas.', 403);
    }
    const { questionId } = questionIdSchema.parse(req.params);
    await ChecklistTemplateService.deleteQuestion(questionId);

    res.json({ success: true, message: 'Pergunta removida com sucesso' });
};

export const updateTemplate: RequestHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'ADMIN') throw new AppError('Acesso negado.', 403);
    const { id } = checklistTemplateIdSchema.parse(req.params);
    const data = updateChecklistTemplateSchema.parse(req.body);

    const updatedTemplate = await ChecklistTemplateService.updateTemplate(id, data);
    res.json({ success: true, data: updatedTemplate });
};

export const updateQuestion: RequestHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'ADMIN') throw new AppError('Acesso negado.', 403);
    const { questionId } = questionIdSchema.parse(req.params);
    const data = updateChecklistQuestionSchema.parse(req.body);

    const updatedQuestion = await ChecklistTemplateService.updateQuestion(questionId, data);
    res.json({ success: true, data: updatedQuestion });
};