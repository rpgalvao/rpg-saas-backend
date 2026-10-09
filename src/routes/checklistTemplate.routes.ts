import { Router } from "express";
import * as ChecklistTemplateController from "../controllers/checklistTemplate.controller";

const route = Router();

// Rota para criar o template vazio
route.post('/', ChecklistTemplateController.createTemplate);

// Rota para listar todos os templates
route.get('/', ChecklistTemplateController.listTemplates);

// Rota para buscar um template e todas as suas perguntas
route.get('/:id', ChecklistTemplateController.getTemplateById);

// Rota para adicionar uma pergunta a um template específico
route.post('/:id/questions', ChecklistTemplateController.addQuestionToTemplate);

// Rota para desativar/ativar o template inteiro
route.patch('/:id/toggle-status', ChecklistTemplateController.toggleTemplateStatus);

// Rota para deletar uma pergunta específica (Usamos /questions/:questionId para não conflitar com a rota do template)
route.delete('/questions/:questionId', ChecklistTemplateController.deleteQuestion);

route.put('/:id', ChecklistTemplateController.updateTemplate);
route.put('/questions/:questionId', ChecklistTemplateController.updateQuestion);

export default route;