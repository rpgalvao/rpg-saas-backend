import { Router } from "express";
import * as AuthController from "../controllers/login.controller";
const route = Router();

route.post('/', AuthController.login);
route.post('/forgot-password', AuthController.forgotPassword);
route.post('/reset-password', AuthController.resetPassword);

export default route;