import { Request } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

export const TMP_FOLDER = path.resolve(process.cwd(), 'uploads', 'tmp');

// Garante que a pasta tmp exista ANTES do Multer agir!
if (!fs.existsSync(TMP_FOLDER)) {
    fs.mkdirSync(TMP_FOLDER, { recursive: true });
}

export const uploadConfig = {
    storage: multer.diskStorage({
        destination: TMP_FOLDER,
        filename: (req, file, callback) => {
            const fileHash = crypto.randomBytes(10).toString('hex');
            const filename = `${fileHash}-${file.originalname}`;
            return callback(null, filename);
        },
    }),
    fileFilter: (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];

        if (allowedTypes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new Error('Tipo de arquivo inválido. Apenas imagens são aceitas'));
        }
    }
};