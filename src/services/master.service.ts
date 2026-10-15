import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";
import { hashPassword } from "../utils/hash";
import { CreateMasterTenantInput } from "../validators/master.validator";

const tenantSelect = {
    id: true,
    name: true,
    tradeName: true,
    cnpj: true,
    phone: true,
    email: true,
    active: true,
    created_at: true,
} as const;

const isUniqueConstraint = (error: unknown, field: string) => {
    if (!error || typeof error !== 'object' || !('code' in error)) return false;
    if (error.code !== 'P2002') return false;

    const target = 'meta' in error ? (error.meta as { target?: unknown; })?.target : undefined;
    if (Array.isArray(target)) return target.includes(field);
    if (typeof target === 'string') return target.includes(field);
    return false;
};

export const listTenants = async () => {
    const tenants = await prisma.tenant.findMany({
        orderBy: { created_at: 'desc' },
        select: {
            ...tenantSelect,
            _count: { select: { users: true } },
        },
    });

    return tenants.map(({ _count, ...tenant }) => ({
        ...tenant,
        userCount: _count.users,
    }));
};

export const createTenantWithAdmin = async (input: CreateMasterTenantInput) => {
    const emailInUse = await prisma.user.findUnique({
        where: { email: input.admin.email },
        select: { id: true },
    });
    if (emailInUse) throw new AppError('E-mail informado já existe no sistema', 400);

    if (input.cnpj) {
        const cnpjInUse = await prisma.tenant.findUnique({
            where: { cnpj: input.cnpj },
            select: { id: true },
        });
        if (cnpjInUse) throw new AppError('CNPJ informado já está cadastrado', 400);
    }

    const hashedPassword = await hashPassword(input.admin.password);

    try {
        return await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: input.name,
                    tradeName: input.tradeName,
                    cnpj: input.cnpj,
                },
                select: tenantSelect,
            });

            const admin = await tx.user.create({
                data: {
                    name: input.admin.name,
                    email: input.admin.email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    tenantId: tenant.id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    created_at: true,
                },
            });

            return { ...tenant, admin, userCount: 1 };
        });
    } catch (error) {
        if (isUniqueConstraint(error, 'email')) {
            throw new AppError('E-mail informado já existe no sistema', 400);
        }
        if (isUniqueConstraint(error, 'cnpj')) {
            throw new AppError('CNPJ informado já está cadastrado', 400);
        }
        throw error;
    }
};

export const toggleTenantStatus = async (id: string) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: { id: true, active: true },
    });

    if (!tenant) throw new AppError('Empresa não encontrada', 404);

    try {
        return await prisma.tenant.update({
            where: { id },
            data: { active: !tenant.active },
            select: tenantSelect,
        });
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Empresa não encontrada', 404);
        throw error;
    }
};
