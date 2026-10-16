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

    const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
            id: true,
            name: true,
            role: true,
            tenantId: true,
            tenant: { select: { active: true } },
        },
    });

    if (!user) throw new AppError('Não autorizado', 401);

    req.user = {
        id: user.id,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
    };

    if (!user.tenant.active && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            error: 'TENANT_BLOCKED',
            message: 'Sua assinatura está suspensa.',
        });
    }

    next();
};