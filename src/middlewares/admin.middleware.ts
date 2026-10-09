import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Puxamos o usuário que foi injetado pelo authMiddleware
    const user = req.user;

    // 2. Trava de segurança extra (caso alguém tente usar este middleware sem usar o auth antes)
    if (!user) {
        throw new AppError('Usuário não autenticado.', 401);
    }

    // 3. A regra de negócio: se não for ADMIN, devolvemos o erro 403 (Forbidden / Proibido)
    if (user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Ação restrita a administradores.', 403);
    }

    // 4. Se for ADMIN, manda a requisição seguir em frente para o Controller
    next();
};