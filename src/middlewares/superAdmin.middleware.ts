import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export const superAdminMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
        throw new AppError('Usuário não autenticado.', 401);
    }

    if (user.role !== 'SUPER_ADMIN') {
        throw new AppError('Acesso negado. Ação restrita a super administradores.', 403);
    }

    next();
};
