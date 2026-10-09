import { RequestHandler } from "express";
import { createUserSchema, getUserByIdSchema, updateUserSchema } from "../validators/user.validator";
import * as UserService from "../services/user.service";
import { AppError } from "../errors/AppError";
import fs from "fs/promises";

export const createUser: RequestHandler = async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const user = await UserService.createUser(data);
    res.status(201).json({ success: true, data: user });
};

export const listUsers: RequestHandler = async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const users = await UserService.getUsersList(includeInactive);
    res.json({ success: true, data: users });
};

export const toggleUserStatus: RequestHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem alterar o status.', 403);
    }
    const { id } = getUserByIdSchema.parse(req.params);
    if (req.user.id === id) {
        throw new AppError('Você não pode alterar o próprio status no sistema.', 400);
    }

    const message = await UserService.toggleUserStatus(id);
    res.json({ success: true, message });
};

export const getUserById: RequestHandler = async (req, res) => {
    const { id } = req.params;
    const user = await UserService.getUserById(id as string);
    res.json({ success: true, data: user });
};

export const updateUser: RequestHandler = async (req, res, next) => {
    const { id } = getUserByIdSchema.parse(req.params);
    const loggedUser = req.user;
    const file = req.file;

    try {
        if (!loggedUser) throw new AppError('Usuário não autenticado', 401);

        // Permite se for o próprio usuário editando seu perfil ou um ADMIN editando qualquer um
        if (loggedUser.id !== id && loggedUser.role !== 'ADMIN') {
            throw new AppError('Usuário não autorizado', 403);
        }

        const data = updateUserSchema.parse(req.body);

        // Se não for ADMIN, impede alterar o nível de acesso por segurança
        if (loggedUser.role !== 'ADMIN' && data.role) {
            throw new AppError('Apenas administradores podem alterar o nível de acesso', 403);
        }

        if (file) {
            data.avatar_url = file.filename;
        }
        const updatedUser = await UserService.updateUser(id, data);

        res.json({ success: true, data: updatedUser });

    } catch (error) {
        if (file && file.path) {
            await fs.unlink(file.path).catch(() => { });
        }
        next(error);
    }
};

export const removeUser: RequestHandler = async (req, res) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        throw new AppError('Acesso negado. Apenas administradores podem desativar usuários.', 403);
    }

    const { id } = getUserByIdSchema.parse(req.params);

    if (req.user.id === id) {
        throw new AppError('Você não pode desativar seu próprio usuário no sistema.', 400);
    }

    const message = await UserService.deactivateUser(id);
    res.json({ success: true, message });
};