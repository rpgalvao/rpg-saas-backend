import { Router } from "express";
import * as CustomerController from "../controllers/customer.controller";

export const route = Router();

route.get('/', CustomerController.getCustomers);
route.post('/', CustomerController.insertCustomer);
route.get('/:id', CustomerController.getCustomerById);
route.put('/:id', CustomerController.updateCustomer);
route.delete('/:id', CustomerController.removeCustomer);

export default route;