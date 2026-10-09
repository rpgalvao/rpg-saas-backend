import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { AppError } from '../errors/AppError';

interface GeneratePdfDTO {
    templateName: string;
    data: any;
    fileName: string;
    // 🟢 NOVOS PARÂMETROS OPCIONAIS PARA SUPORTAR A ETIQUETA
    width?: string;
    height?: string;
    margin?: { top: string; bottom: string; left: string; right: string; };
}

export class PdfProvider {
    private templatesFolder = path.resolve(process.cwd(), 'src', 'templates');
    private destFolder = path.resolve(process.cwd(), 'uploads', 'os_pdfs');

    constructor() {
        if (!fs.existsSync(this.destFolder)) {
            fs.mkdirSync(this.destFolder, { recursive: true });
        }
    }

    public async generatePdf({ templateName, data, fileName, width, height, margin }: GeneratePdfDTO): Promise<string> {
        try {
            const templatePath = path.resolve(this.templatesFolder, `${templateName}.hbs`);

            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template ${templateName} não encontrado no caminho: ${templatePath}`);
            }

            const templateFile = await fs.promises.readFile(templatePath, 'utf-8');
            const compileTemplate = handlebars.compile(templateFile);
            const htmlContent = compileTemplate(data);

            const filePath = path.resolve(this.destFolder, fileName);

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });

            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'load' });

            // 🟢 CONFIGURAÇÃO DINÂMICA: Se mandar width/height, usa customizado. Senão, usa A4.
            await page.pdf({
                path: filePath,
                printBackground: true,
                format: (!width && !height) ? 'A4' : undefined,
                width: width,
                height: height,
                margin: margin || { top: '20px', bottom: '20px', left: '20px', right: '20px' }
            });

            await browser.close();
            return fileName;

        } catch (error) {
            console.error('🚨 [PdfProvider] Erro ao gerar PDF:', error);
            throw new AppError('Não foi possível gerar o documento da Ordem de Serviço.', 500);
        }
    }
}