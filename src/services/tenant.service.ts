import { AppError } from "../errors/AppError";
import { prisma } from "../libs/prisma";
import { DiskStorageProvider } from "../providers/StorageProvider";
import { setFullURL } from "../utils/setFullUrl";
import { UpdateTenantInput } from "../validators/tenant.validator";

const tenantSelect = {
    id: true,
    name: true,
    tradeName: true,
    cnpj: true,
    phone: true,
    email: true,
    logo_url: true,
    active: true,
    created_at: true,
} as const;

const withLogoUrl = <T extends { logo_url: string | null; }>(tenant: T) => ({
    ...tenant,
    logo_url: tenant.logo_url ? setFullURL(`/uploads/logos/${tenant.logo_url}`) : null,
});

export const getTenant = async (tenantId: string) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: tenantSelect,
    });

    if (!tenant) throw new AppError('Empresa não encontrada', 404);

    return withLogoUrl(tenant);
};

export const updateTenant = async (
    tenantId: string,
    data: UpdateTenantInput,
    logoFile?: Express.Multer.File
) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: tenantSelect,
    });

    if (!tenant) throw new AppError('Empresa não encontrada', 404);

    if (data.cnpj && data.cnpj !== tenant.cnpj) {
        const cnpjInUse = await prisma.tenant.findUnique({
            where: { cnpj: data.cnpj },
            select: { id: true },
        });

        if (cnpjInUse) {
            throw new AppError('CNPJ informado já está cadastrado', 400);
        }
    }

    const updateData: UpdateTenantInput & { logo_url?: string; } = { ...data };

    if (logoFile) {
        const storage = new DiskStorageProvider();
        const savedFileName = await storage.saveFile(logoFile.filename, 'logos', `${tenantId}.webp`);

        if (tenant.logo_url && tenant.logo_url !== savedFileName) {
            await storage.deleteFile(tenant.logo_url, 'logos');
        }

        updateData.logo_url = savedFileName;
    }

    try {
        const updatedTenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: updateData,
            select: tenantSelect,
        });

        return withLogoUrl(updatedTenant);
    } catch (error: any) {
        if (error.code === 'P2025') throw new AppError('Empresa não encontrada', 404);
        if (error.code === 'P2002') throw new AppError('CNPJ informado já está cadastrado', 400);
        throw error;
    }
};
