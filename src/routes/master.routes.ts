import { Router } from "express";
import * as MasterController from "../controllers/master.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { superAdminMiddleware } from "../middlewares/superAdmin.middleware";

const route = Router();

route.use(authMiddleware);
route.use(superAdminMiddleware);

route.get('/tenants', MasterController.listTenants);
route.post('/tenants', MasterController.createTenant);
route.get('/tenants/:id', MasterController.getTenant);
route.put('/tenants/:id', MasterController.updateTenant);
route.patch('/tenants/:id/toggle', MasterController.toggleTenant);
route.get('/tenants/:id/users', MasterController.listTenantUsers);

route.get('/tenants/:id/payments', MasterController.listTenantPayments);
route.post('/tenants/:id/payments', MasterController.createTenantPayment);
route.patch('/tenants/:tenantId/payments/:paymentId', MasterController.updateTenantPayment);
route.delete('/tenants/:tenantId/payments/:paymentId', MasterController.deleteTenantPayment);

export default route;
