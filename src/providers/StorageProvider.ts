import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export class DiskStorageProvider {
    // O Provider só precisa conhecer a pasta temporária por padrão
    private tmpFolder = path.resolve(process.cwd(), 'uploads', 'tmp');

    constructor() {
        if (!fs.existsSync(this.tmpFolder)) {
            fs.mkdirSync(this.tmpFolder, { recursive: true });
        }
    }

    // Agora passamos o subFolder (ex: 'avatars' ou 'os_images') e o finalFileName
    public async saveFile(tmpFileName: string,
        subFolder: string,
        finalFileName: string,
        width?: number,
        height?: number): Promise<string> {
        const originalPath = path.resolve(this.tmpFolder, tmpFileName);

        // Define dinamicamente a pasta de destino baseada no parâmetro
        const destFolder = path.resolve(process.cwd(), 'uploads', subFolder);

        // Se a pasta destino (ex: avatars) não existir, o Provider cria na hora!
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
        }

        // Garantimos que a extensão no nome seja .webp
        const safeFinalName = finalFileName.endsWith('.webp') ? finalFileName : `${finalFileName}.webp`;
        const destPath = path.resolve(destFolder, safeFinalName);

        try {
            // Inicia a instância do Sharp
            let sharpInstance = sharp(originalPath);

            // Se passarmos largura e altura (ex: Avatar), ele corta a imagem
            if (width && height) {
                sharpInstance = sharpInstance.resize(width, height, { fit: 'cover' });
            }
            // Se não passarmos (ex: Foto Full da OS), ele ignora o resize e apenas converte para WebP com 80% de qualidade e salva
            await sharpInstance
                .webp({ quality: 80 })
                .toFile(destPath);

            return safeFinalName;

        } finally {
            // Limpeza garantida da pasta tmp
            if (fs.existsSync(originalPath)) {
                await fs.promises.unlink(originalPath);
            }
        }
    }

    // Agora o delete também recebe de qual subFolder ele deve apagar o arquivo
    public async deleteFile(fileName: string, subFolder: string): Promise<void> {
        const destFolder = path.resolve(process.cwd(), 'uploads', subFolder);
        const filePath = path.resolve(destFolder, fileName);

        try {
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath);
            }
        } catch (error) {
            return;
        }
    }
}