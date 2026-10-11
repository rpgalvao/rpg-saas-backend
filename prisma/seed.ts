import "dotenv/config";
import { prisma } from "../src/libs/prisma";
import { hashPassword } from "../src/utils/hash";

async function main() {
    console.log("🌱 Plantando dados iniciais...");

    // 1. Cria a sua Empresa (Tenant)
    const tenant = await prisma.tenant.create({
        data: {
            name: "RPG Sistemas Matriz",
            // Se o seu Tenant tiver outros campos obrigatórios (como CNPJ), adicione-os aqui
        },
    });

    // 2. Criptografa a senha de teste
    const hashedPassword = await hashPassword("teste@123");

    // 3. Cria o usuário Admin
    const user = await prisma.user.create({
        data: {
            name: "Renato Admin",
            email: "admin@rpgsistemas.com.br",
            password: hashedPassword,
            role: "ADMIN",
            tenantId: tenant.id,
        },
    });

    console.log("✅ Banco populado com sucesso!");
    console.log("🏢 Empresa:", tenant.name);
    console.log("👤 Usuário:", user.email);
    console.log("🔑 Senha:", "teste@123");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
