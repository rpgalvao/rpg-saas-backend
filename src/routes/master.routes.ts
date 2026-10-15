import { Router } from "express";
import * as MasterController from "../controllers/master.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { superAdminMiddleware } from "../middlewares/superAdmin.middleware";

const route = Router();

route.use(authMiddleware);
route.use(superAdminMiddleware);

route.get('/tenants', MasterController.listTenants);
route.post('/tenants', MasterController.createTenant);
route.patch('/tenants/:id/toggle', MasterController.toggleTenant);

export default route;
