import { Router } from "express";
import multer from "multer";
import * as TenantController from "../controllers/tenant.controller";
import { uploadConfig } from "../libs/multer";
import { adminMiddleware } from "../middlewares/admin.middleware";
import { authMiddleware } from "../middlewares/auth.middleware";

const route = Router();
const upload = multer(uploadConfig);

route.use(authMiddleware);
route.use(adminMiddleware);

route.get('/me', TenantController.getMe);
route.put('/me', upload.single('logo'), TenantController.updateMe);

export default route;
