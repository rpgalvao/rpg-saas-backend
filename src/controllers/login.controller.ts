import { RequestHandler } from "express";
import { forgotPasswordSchema, loginTechnicianSchema, resetPasswordSchema } from "../validators/login.validator";
import * as AuthService from "../services/auth.service";
import { AppError } from "../errors/AppError";

export const login: RequestHandler = async (req, res) => {
    const data = loginTechnicianSchema.parse(req.body);
    const { email, password } = data;
    const user = await AuthService.loginUser(email, password);
    if (!user) throw new AppError('Não autorizado', 401);
    res.json({ success: true, data: user });
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);

        await AuthService.forgotPassword(email);

        // Retornamos sucesso sempre (mesmo se o e-mail não existir, pela regra de segurança)
        res.json({
            success: true,
            message: 'Se o e-mail informado existir em nossa base, um link de recuperação será enviado em instantes.'
        });
    } catch (error) {
        next(error);
    }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
    try {
        const { token, password } = resetPasswordSchema.parse(req.body);

        await AuthService.resetPassword(token, password);

        res.json({
            success: true,
            message: 'Senha redefinida com sucesso! Você já pode fazer login no sistema.'
        });
    } catch (error) {
        next(error);
    }
};