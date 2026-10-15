import { Router } from "express";
import * as StockMovementController from "../controllers/stockMovement.controller";
import { adminMiddleware } from "../middlewares/admin.middleware";

const route = Router();

route.post('/', adminMiddleware, StockMovementController.createMovement);
route.get('/', StockMovementController.getMovements);

export default route;
