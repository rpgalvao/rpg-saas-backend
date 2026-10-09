import { Router } from "express";
import * as SupplierController from "../controllers/supplier.controller";

const route = Router();

route.post('/', SupplierController.createSupplier);
route.get('/', SupplierController.getSuppliers);
route.get('/:id', SupplierController.getSupplier);
route.put('/:id', SupplierController.updateSupplier);
route.delete('/:id', SupplierController.deleteSupplier);

export default route;