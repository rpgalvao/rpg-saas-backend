import { AppError } from "../errors/AppError";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";
import { DiskStorageProvider } from "../providers/StorageProvider";
import { hashPassword, verifyPassword } from "../utils/hash";
import { setFullURL } from "../utils/setFullUrl";
import { UpdateUserInput } from "../validators/user.validator";

export const createUser = async (data: Prisma.UserCreateInput) => {
    const emailExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) throw new AppError('E-mail informado já existe no sistema', 400);

    const hashedPassword = await hashPassword(data.password);

    const newUser = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            phone: data.phone,
            role: data.role // Inserindo o nível de acesso no banco
        },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            created_at: true
        }
    });

    return newUser;
};

export const getUsersList = async (includeInactive: boolean = false) => {
    const usersList = await prisma.user.findMany({
        where: includeInactive ? undefined : { active: true },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            active: true // 🟢 Crucial: o frontend precisa saber quem está inativo!
        }
    });
    return usersList;
};

export const toggleUserStatus = async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuário não encontrado', 404);

    const updatedUser = await prisma.user.update({
        where: { id },
        data: { active: !user.active }
    });

    return updatedUser.active ? 'Usuário reativado com sucesso' : 'Usuário desativado com sucesso';
};

export const getUserByEmail = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return user;
};

export const getUserById = async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuário não encontrado', 404);
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url ? setFullURL(`/uploads/avatars/${user.avatar_url}`) : null,
        signature_url: user.signature_url,
        created_at: user.created_at
    };
};

export const updateUser = async (id: string, data: UpdateUserInput) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuário não encontrado!', 404);

    // Tipamos temporariamente como 'any' (ou Record<string, any>) para manipularmos os campos virtuais
    const updateData: any = { ...data };
    const storage = new DiskStorageProvider();

    if (updateData.avatar_url && typeof updateData.avatar_url === 'string') {
        const tmpFileName = updateData.avatar_url;
        const finalFileName = `${id}.webp`;

        // 3. Chamamos o Provider passando os 5 parâmetros: (arquivo_temp, pasta, nome_final, largura, altura)
        const savedFileName = await storage.saveFile(tmpFileName, 'avatars', finalFileName, 256, 256);

        // 4. Limpeza da foto antiga
        // Se ele já tinha foto e o nome antigo era diferente (ex: de uma versão velha do sistema) nós apagamos.
        // (Se o nome fosse igual, o próprio Sharp já sobrescreveu no disco na linha de cima).
        if (user.avatar_url && user.avatar_url !== savedFileName) {
            await storage.deleteFile(user.avatar_url, 'avatars');
        }

        // Substituímos o nome temporário pelo nome limpo
        updateData.avatar_url = savedFileName;
    }

    if (updateData.email && updateData.email !== user.email) {
        const emailExists = await getUserByEmail(updateData.email as string);
        if (emailExists) {
            throw new AppError("E-mail informado já está em uso", 400);
        }
    }

    // Lógica da senha
    if (updateData.newPassword) {
        if (!updateData.currentPassword) {
            throw new AppError("Para alterar a senha, você deve informar a senha atual.", 400);
        }

        const passwordCheck = await verifyPassword(updateData.currentPassword, user.password);
        if (!passwordCheck) {
            throw new AppError("A senha atual informada está incorreta.", 401);
        }

        updateData.password = await hashPassword(updateData.newPassword);
    }

    // 🧹 O Pulo do Gato: Deletamos os campos virtuais antes de enviar pro Prisma!
    // Assim, o Prisma só recebe o que realmente é coluna no banco.
    delete updateData.currentPassword;
    delete updateData.newPassword;

    const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar_url: true,
            created_at: true,
            phone: true,
            signature_url: true // Pode descomentar isso depois que criar a coluna no Prisma
        }
    });

    if (!updatedUser) throw new AppError('Erro ao atualizar o usuário!', 500);

    if (updatedUser.avatar_url) {
        updatedUser.avatar_url = setFullURL(`/uploads/avatars/${updatedUser.avatar_url}`);
    }

    return updatedUser;
};

export const deactivateUser = async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuário não encontrado', 404);
    await prisma.user.update({
        where: { id },
        data: { active: false }
    });

    return 'Usuário desativado com sucesso';
};