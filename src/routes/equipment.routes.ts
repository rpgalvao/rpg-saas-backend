import { Router } from "express";
import * as EquipmentController from "../controllers/equipment.controller";

const route = Router();

route.post('/', EquipmentController.insertEquipment);
route.get('/', EquipmentController.getEquipmentList);
route.get('/:id', EquipmentController.getEquipmentById);
route.get('/:serial_number/search', EquipmentController.getEquipmentBySerialNumber);
route.put('/:id', EquipmentController.updateEquipment);
route.delete('/:id', EquipmentController.removeEquipment);

export default route;