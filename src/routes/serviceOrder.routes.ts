import { Router } from "express";
import * as ServiceOrderController from "../controllers/serviceOrder.controller";
import multer from "multer";
import { uploadConfig } from "../libs/multer";

const route = Router();
const upload = multer(uploadConfig);

route.post('/', ServiceOrderController.createServiceOrder);
route.get('/', ServiceOrderController.listServiceOrders);
route.get('/:id', ServiceOrderController.listServiceOrderById);
route.put('/:id', ServiceOrderController.updateServiceOrder);

route.patch('/:id/cancel', ServiceOrderController.cancelServiceOrder);
route.patch('/:id/reopen', ServiceOrderController.reopenServiceOrder);
route.patch('/:id/checklist', ServiceOrderController.updateChecklist);
route.post('/:id/parts', ServiceOrderController.addPart);
route.patch('/:id/signature', ServiceOrderController.saveClientSignature);
route.post('/:id/images', upload.single('file'), ServiceOrderController.uploadImage);
route.delete('/images/:imageId', ServiceOrderController.removeImage);

route.post('/:id/send-email', ServiceOrderController.sendEmail);
route.get('/:id/label', ServiceOrderController.generateLabel);

export default route;