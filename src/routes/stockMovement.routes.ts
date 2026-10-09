import { Router } from "express";
import * as StockMovementController from "../controllers/stockMovement.controller";

const route = Router();

route.post('/', StockMovementController.createMovement);
route.get('/', StockMovementController.getMovements);

export default route;