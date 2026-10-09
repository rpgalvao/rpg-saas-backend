import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import route from './routes/index.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import path from 'path';

const server = express();
const port = process.env.PORT || 3000;

// Avisa o Express para ler o IP real através do proxy
server.set('trust proxy', 1);

// ==========================================
// 🛡️ 1. CORS: A Lista VIP de Acessos
// ==========================================
// Aqui garantimos que você não seja bloqueado no desenvolvimento local!
const allowedOrigins = [
    'http://localhost:5173', // O endereço padrão do seu Vite (React)
    'http://localhost:3000', // Caso rode alguma outra interface local
    process.env.FRONTEND_URL // A futura URL de produção (Ex: https://app.dwl.com.br)
].filter(Boolean) as string[]; // Remove opções vazias caso a variável de ambiente não exista ainda
server.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true // Permite envio de cookies/headers de autorização com segurança
}));

server.use(helmet());
server.use(express.urlencoded({ extended: true }));
server.use(express.json());
server.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.resolve(process.cwd(), 'uploads')));

// ==========================================
// 🚀 ROTAS E TRATAMENTO DE ERROS
// ==========================================
server.use('/api', route);

server.use(errorHandler);
server.listen(port, () => {
    console.log(`Server running at: http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENVIRONMENT || 'development'}`);
});