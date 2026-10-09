import { Router } from "express";
import * as DashboardController from "../controllers/dashboard.controller";

const route = Router();

route.get('/metrics', DashboardController.getMetrics);

export default route;