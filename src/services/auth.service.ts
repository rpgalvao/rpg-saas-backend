import crypto from "crypto";
import { AppError } from "../errors/AppError";
import { generateToken } from "../libs/jwt";
import { prisma } from "../libs/prisma";
import { hashPassword, verifyPassword } from "../utils/hash";
import { getUserByEmail } from "./user.service";
import { MailProvider } from "../providers/MailProvider";
import { setFullURL } from "../utils/setFullUrl";

export const loginUser = async (email: string, password: string) => {
    // Atenção: Garanta que a função getUserByEmail lá no user.service.ts 
    // esteja retornando todos os dados do usuário, incluindo o novo tenantId.
    const user = await getUserByEmail(email);

    if (!user) throw new AppError('Credenciais inválidas', 401);

    const passwordCheck = await verifyPassword(password, user.password);
    if (!passwordCheck) throw new AppError('Credenciais inválidas!', 401);

    // 🟢 NOVA ASSINATURA: Injetamos a "chave mestra" da empresa no Token
    const token = generateToken({
        id: user.id,
        tenantId: user.tenantId, // Isolamento garantido
        role: user.role,
        name: user.name
    });

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            tenantId: user.tenantId, // O frontend pode precisar saber qual é a empresa
            signature_url: user.signature_url,
            avatar_url: user.avatar_url ? setFullURL(`/uploads/avatars/${user.avatar_url}`) : null,
            created_at: user.created_at
        }, token
    };
};

export const forgotPassword = async (email: string) => {
    // 🟢 ATUALIZAÇÃO SAAS: Usamos o include para trazer os dados da empresa (Tenant)
    const user = await prisma.user.findUnique({
        where: { email },
        include: { tenant: true } // Traz o nome da assistência técnica
    });

    if (!user) return;

    const token = crypto.randomBytes(20).toString('hex');

    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            reset_password_token: token,
            reset_password_expires: expires
        }
    });

    const mailProvider = new MailProvider();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/redefinir-senha?token=${token}`;

    // 🟢 E-MAIL DINÂMICO: O nome da empresa (user.tenant.name) agora é renderizado de acordo com o cliente
    const mailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0056b3;">Recuperação de Senha</h2>
            <p>Olá, <strong>${user.name}</strong>,</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema da <strong>${user.tenant.name}</strong>.</p>
            <p>Clique no botão abaixo para criar uma nova senha. <strong>Este link é válido por apenas 1 hora.</strong></p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #0056b3; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Redefinir Minha Senha
                </a>
            </div>
            <p style="font-size: 12px; color: #777;">Se você não solicitou essa alteração, por favor ignore este e-mail. Nenhuma mudança será feita na sua conta.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777; text-align: center;">Equipe Sistema de Gestão</p>
        </div>
    `;

    await mailProvider.sendMail({
        to: user.email,
        subject: `Recuperação de Senha - ${user.tenant.name}`,
        body: mailBody
    });
};

export const resetPassword = async (token: string, newPassword: string) => {
    const user = await prisma.user.findFirst({
        where: {
            reset_password_token: token,
            reset_password_expires: {
                gt: new Date()
            }
        }
    });

    if (!user) {
        throw new AppError('Token inválido ou expirado. Por favor, solicite uma nova recuperação de senha.', 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            reset_password_token: null,
            reset_password_expires: null
        }
    });
};