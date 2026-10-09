import nodemailer from 'nodemailer';
import { AppError } from '../errors/AppError';

// 1. Adicionamos o array opcional de attachments na interface
interface SendMailDTO {
    to: string;
    subject: string;
    body: string;
    attachments?: {
        filename: string;
        path: string;
        contentType?: string;
        cid?: string;
    }[];
}

export class MailProvider {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: Number(process.env.MAIL_PORT),
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }

    // 2. Desestruturamos a nova propriedade recebida
    public async sendMail({ to, subject, body, attachments }: SendMailDTO): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_EMAIL}>`,
                to,
                subject,
                html: body,
                attachments, // 3. Repassamos para o Nodemailer
            });

            console.log(`✉️ [MailProvider] E-mail enviado com sucesso para: ${to}`);
        } catch (error) {
            console.error(`🚨 [MailProvider] Erro ao enviar e-mail:`, error);
            throw new AppError('Falha no envio de e-mail. Tente novamente mais tarde.', 500);
        }
    }
}