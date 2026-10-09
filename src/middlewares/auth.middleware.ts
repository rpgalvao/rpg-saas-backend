import { NextFunction, Request, Response } from "express";
import { decodeToken } from "../libs/jwt";
import { AppError } from "../errors/AppError";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AppError('Não autorizado', 401);
    const [_, token] = authHeader.split(' ');
    if (!token) throw new AppError('Não autorizado', 401);
    const decoded = await decodeToken(token);
    if (!decoded) throw new AppError('Não autorizado', 401);
    req.user = decoded;
    next();
};