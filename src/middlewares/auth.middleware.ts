import { NextFunction, Request, Response } from "express";
import { decodeToken } from "../libs/jwt";
import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError('Não autorizado', 401);
    const [_, token] = authHeader.split(' ');
    if (!token) throw new AppError('Não autorizado', 401);
    const decoded = await decodeToken(token);
    if (!decoded) throw new AppError('Não autorizado', 401);
    req.user = decoded;

    if (decoded.role !== 'SUPER_ADMIN') {
        const tenant = await prisma.tenant.findUnique({
            where: { id: decoded.tenantId },
            select: { active: true },
        });

        if (!tenant || !tenant.active) {
            throw new AppError('Assinatura suspensa. Entre em contato com a RPG Sistemas.', 403);
        }
    }

    next();
};