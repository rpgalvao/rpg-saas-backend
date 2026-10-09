import { Router } from "express";
import userRoute from "./user.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import authRoute from "./auth.routes";
import customerRoute from "./customer.routes";
import equipmentRoute from "./equipment.routes";
import serviceOrderRoute from "./serviceOrder.routes";
import dashboardRoute from "./dashboard.routes";
import equipmentModelRoute from './equipmentModel.routes';
import checklistTemplateRoute from './checklistTemplate.routes';
import supplierRoute from './supplier.routes';
import partRoute from './part.routes';
import stockMovementRoute from './stockMovement.routes';
import { adminMiddleware } from "../middlewares/admin.middleware";
import rateLimit from "express-rate-limit";
import * as ServiceOrderController from "../controllers/serviceOrder.controller";

const route = Router();

const loginLimiter = rateLimit({
    max: 5,
    message: {
        success: false,
        message: 'Muitas tentativas de login. Por segurança, aguarde 15 minutos e tente novamente.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

route.get('/ping', (req, res) => {
    res.json({ pong: true });
});

route.use('/login', loginLimiter, authRoute);

// 🟢 ROTA PÚBLICA PARA O QR CODE (Bypassa o JWT por estar ANTES do middleware)
route.get('/serviceorder/:id/export/pdf', ServiceOrderController.exportPdf); // Usada pelo React
route.get('/serviceorder/:id/qr-pdf', ServiceOrderController.viewPdfFromQr); // Usada pelo Celular

// 🛡️ BARREIRA DE SEGURANÇA
route.use(authMiddleware);

// Rotas Protegidas
route.use('/user', userRoute);
route.use('/dashboard', dashboardRoute);
route.use('/customer', customerRoute);
route.use('/equipment', equipmentRoute);
route.use('/serviceorder', serviceOrderRoute);
route.use('/equipmentmodel', equipmentModelRoute);
route.use('/checklist-templates', adminMiddleware, checklistTemplateRoute);
route.use('/suppliers', adminMiddleware, supplierRoute);
route.use('/parts', partRoute);
route.use('/stock-movements', stockMovementRoute);

export default route;