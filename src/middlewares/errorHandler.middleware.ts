import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const errorHandler = (
    error: Error & { statusCode?: number; },
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: 'Dados informados inválidos',
            errors: error.flatten().fieldErrors
        });
    }

    const statusCode = error.statusCode ?? 500;
    const message = error.statusCode ? error.message : 'Oooops! Alguma coisa deu errado...';

    // MUDANÇA AQUI: Imprimimos a rota e depois o "Stack Trace" (o corpo inteiro do erro)
    console.error(`\n🚨 [Erro Interno] Requisição falhou na rota: ${req.method} ${req.url}`);
    console.error(error);
    console.error(`------------------------------------------------------\n`);

    return res.status(statusCode).json({ success: false, message });
};