import { Router } from "express";
import * as PartController from "../controllers/part.controller";
import { adminMiddleware } from "../middlewares/admin.middleware";

const route = Router();

route.post('/', adminMiddleware, PartController.createPart);
route.get('/', adminMiddleware, PartController.getParts);
// ⚠️ Rota específica DEVE vir antes das rotas com parâmetros dinâmicos (/:id)
route.get('/dashboard/low-stock', PartController.getLowStockDashboard);
route.get('/:id', PartController.getPart);
route.put('/:id', PartController.updatePart);
route.delete('/:id', adminMiddleware, PartController.deletePart);

export default route;