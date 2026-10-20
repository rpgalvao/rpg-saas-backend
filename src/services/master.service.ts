import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";
import { hashPassword } from "../utils/hash";
import {
    CreateMasterTenantInput,
    CreateTenantPaymentInput,
    UpdateMasterTenantInput,
    UpdateTenantPaymentInput,
} from "../validators/master.validator";

const tenantSelect = {
    id: true,
    name: true,
    tradeName: true,
    cnpj: true,
    address: true,
    stateRegistration: true,
    municipalRegistration: true,
    phone: true,
    email: true,
    active: true,
    maxConcurrentUsers: true,
    created_at: true,
} as const;

const userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    active: true,
    created_at: true,
} as const;

const paymentSelect = {
    id: true,
    amount: true,
    dueDate: true,
    paidDate: true,
    status: true,
    tenantId: true,
} as const;

const assertTenantExists = async (tenantId: string) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true },
    });
    if (!tenant) throw new AppError('Empresa não encontrada', 404);
};

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
        where: { email: input.adminEmail },
        select: { id: true },
    });
    if (emailInUse) throw new AppError('E-mail informado já existe no sistema', 400);

    const cnpjInUse = await prisma.tenant.findUnique({
        where: { cnpj: input.cnpj },
        select: { id: true },
    });
    if (cnpjInUse) throw new AppError('CNPJ informado já está cadastrado', 400);

    const hashedPassword = await hashPassword(input.adminPassword);

    try {
        return await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: input.name,
                    tradeName: input.tradeName,
                    cnpj: input.cnpj,
                    address: input.address,
                    stateRegistration: input.stateRegistration,
                    municipalRegistration: input.municipalRegistration,
                },
                select: tenantSelect,
            });

            const admin = await tx.user.create({
                data: {
                    name: input.adminName,
                    email: input.adminEmail,
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

export const getTenantById = async (id: string) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: {
            ...tenantSelect,
            users: {
                select: userSelect,
                orderBy: { created_at: 'asc' },
            },
            payments: {
                select: paymentSelect,
                orderBy: { dueDate: 'desc' },
            },
        },
    });

    if (!tenant) throw new AppError('Empresa não encontrada', 404);

    return tenant;
};

export const updateTenant = async (id: string, input: UpdateMasterTenantInput) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id },
        select: { id: true },
    });

    if (!tenant) throw new AppError('Empresa não encontrada', 404);

    if (input.cnpj) {
        const cnpjInUse = await prisma.tenant.findFirst({
            where: {
                cnpj: input.cnpj,
                NOT: { id },
            },
            select: { id: true },
        });
        if (cnpjInUse) throw new AppError('CNPJ informado já está cadastrado', 400);
    }

    try {
        return await prisma.tenant.update({
            where: { id },
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.tradeName !== undefined && { tradeName: input.tradeName }),
                ...(input.cnpj !== undefined && { cnpj: input.cnpj }),
                ...(input.address !== undefined && { address: input.address }),
                ...(input.stateRegistration !== undefined && {
                    stateRegistration: input.stateRegistration,
                }),
                ...(input.municipalRegistration !== undefined && {
                    municipalRegistration: input.municipalRegistration,
                }),
                ...(input.active !== undefined && { active: input.active }),
                ...(input.maxConcurrentUsers !== undefined && {
                    maxConcurrentUsers: input.maxConcurrentUsers,
                }),
            },
            select: tenantSelect,
        });
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Empresa não encontrada', 404);
        if (isUniqueConstraint(error, 'cnpj')) {
            throw new AppError('CNPJ informado já está cadastrado', 400);
        }
        throw error;
    }
};

export const listTenantUsers = async (tenantId: string) => {
    await assertTenantExists(tenantId);

    return prisma.user.findMany({
        where: { tenantId },
        select: userSelect,
        orderBy: { created_at: 'asc' },
    });
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

export const listTenantPayments = async (tenantId: string) => {
    await assertTenantExists(tenantId);

    return prisma.tenantPayment.findMany({
        where: { tenantId },
        orderBy: { dueDate: 'desc' },
        select: paymentSelect,
    });
};

export const createTenantPayment = async (tenantId: string, input: CreateTenantPaymentInput) => {
    await assertTenantExists(tenantId);

    return prisma.tenantPayment.create({
        data: {
            tenantId,
            amount: input.amount,
            dueDate: input.dueDate,
            status: input.status ?? 'PENDING',
            paidDate: input.paidDate ?? null,
        },
        select: paymentSelect,
    });
};

export const updateTenantPayment = async (
    tenantId: string,
    paymentId: string,
    input: UpdateTenantPaymentInput,
) => {
    await assertTenantExists(tenantId);

    const payment = await prisma.tenantPayment.findFirst({
        where: { id: paymentId, tenantId },
        select: { id: true },
    });
    if (!payment) throw new AppError('Pagamento não encontrado', 404);

    try {
        return await prisma.tenantPayment.update({
            where: { id: paymentId },
            data: {
                ...(input.status !== undefined && { status: input.status }),
                ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
            },
            select: paymentSelect,
        });
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Pagamento não encontrado', 404);
        throw error;
    }
};

export const deleteTenantPayment = async (tenantId: string, paymentId: string) => {
    await assertTenantExists(tenantId);

    const payment = await prisma.tenantPayment.findFirst({
        where: { id: paymentId, tenantId },
        select: { id: true },
    });
    if (!payment) throw new AppError('Pagamento não encontrado', 404);

    try {
        await prisma.tenantPayment.delete({ where: { id: paymentId } });
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Pagamento não encontrado', 404);
        throw error;
    }
};
