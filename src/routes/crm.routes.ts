import { Router } from "express";
import * as CrmController from "../controllers/crm.controller";

const route = Router();

route.get('/pipeline', CrmController.getPipeline);
route.post('/deals', CrmController.createDeal);
route.patch('/deals/:id/move', CrmController.moveDeal);
route.patch('/deals/:id/status', CrmController.updateDealStatus);

export default route;
