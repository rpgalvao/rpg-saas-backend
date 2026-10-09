import { Router } from "express";
import * as EquipmentModelController from "../controllers/equipmentModel.controller";

const route = Router();

route.post('/', EquipmentModelController.createEquipmentModel);
route.get('/', EquipmentModelController.listEquipmentModels);
route.get('/:id', EquipmentModelController.getEquipmentModelById);
route.put('/:id', EquipmentModelController.updateEquipmentModel);
route.patch('/:id/toggle-status', EquipmentModelController.toggleEquipmentModelStatus);

export default route;