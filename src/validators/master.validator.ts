import z from "zod";

const optionalText = z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => {
        if (value == null) return null;
        return value.length > 0 ? value : null;
    });

const cnpjSchema = z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, '').length === 14, 'CNPJ inválido')
    .transform((value) => value.replace(/\D/g, ''));

export const createMasterTenantSchema = z.object({
    name: z.string().trim().min(2, 'A razão social deve conter pelo menos 2 caracteres'),
    tradeName: z.string().trim().min(2, 'O nome fantasia deve conter pelo menos 2 caracteres'),
    cnpj: cnpjSchema,
    address: optionalText,
    stateRegistration: optionalText,
    municipalRegistration: optionalText,
    adminName: z.string().trim().min(2, 'O nome do administrador deve conter pelo menos 2 caracteres'),
    adminEmail: z.email('E-mail informado é inválido'),
    adminPassword: z.string().min(5, 'A senha deve conter pelo menos 5 caracteres'),
});

export const updateMasterTenantSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'A razão social deve conter pelo menos 2 caracteres')
        .optional(),
    tradeName: z
        .string()
        .trim()
        .min(2, 'O nome fantasia deve conter pelo menos 2 caracteres')
        .optional()
        .nullable(),
    cnpj: cnpjSchema.optional(),
    address: optionalText,
    stateRegistration: optionalText,
    municipalRegistration: optionalText,
    active: z.coerce.boolean().optional(),
});

export const tenantIdParamSchema = z.object({
    id: z.uuid('Identificador da empresa inválido'),
});

const paymentStatusMap: Record<string, string> = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED',
    PENDENTE: 'PENDING',
    PAGO: 'PAID',
    ATRASADO: 'OVERDUE',
    CANCELADO: 'CANCELLED',
};

function toDateOrUndefined(value: unknown): Date | undefined {
    if (value == null || value === '') return undefined;

    const date = value instanceof Date ? value : new Date(value as string | number);
    if (Number.isNaN(date.getTime())) {
        throw new z.ZodError([
            {
                code: 'custom',
                path: [],
                message: 'Data inválida',
            },
        ]);
    }

    return date;
}

function normalizePaymentStatus(value: unknown): string {
    if (value == null || value === '') return 'PENDING';

    const key = String(value).trim().toUpperCase();
    return paymentStatusMap[key] ?? String(value).trim().toUpperCase();
}

export const createTenantPaymentSchema = z
    .object({
        amount: z.any().transform(Number),
        dueDate: z.any().transform((val) => new Date(val)),
        status: z.string().optional(),
        paidDate: z.any().optional().nullable(),
        paidAt: z.any().optional().nullable(),
    })
    .transform((data) => {
        const amount = Number(data.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new z.ZodError([
                {
                    code: 'custom',
                    path: ['amount'],
                    message: 'O valor deve ser um número positivo',
                },
            ]);
        }

        const dueDate = data.dueDate instanceof Date
            ? data.dueDate
            : new Date(data.dueDate);

        if (Number.isNaN(dueDate.getTime())) {
            throw new z.ZodError([
                {
                    code: 'custom',
                    path: ['dueDate'],
                    message: 'Data de vencimento inválida',
                },
            ]);
        }

        const paidRaw = data.paidDate ?? data.paidAt;
        let paidDate: Date | null = null;

        if (paidRaw != null && paidRaw !== '') {
            paidDate = toDateOrUndefined(paidRaw) ?? null;
        }

        return {
            amount,
            dueDate,
            status: normalizePaymentStatus(data.status),
            paidDate,
        };
    });

export const updateTenantPaymentSchema = z
    .object({
        status: z.string().optional(),
        paidDate: z.any().optional().nullable(),
        paidAt: z.any().optional().nullable(),
    })
    .transform((data) => {
        const paidRaw = data.paidDate !== undefined ? data.paidDate : data.paidAt;
        const hasPaid = data.paidDate !== undefined || data.paidAt !== undefined;

        return {
            status:
                data.status !== undefined
                    ? normalizePaymentStatus(data.status)
                    : undefined,
            paidDate: hasPaid
                ? paidRaw == null || paidRaw === ''
                    ? null
                    : toDateOrUndefined(paidRaw) ?? null
                : undefined,
        };
    })
    .refine((data) => data.status !== undefined || data.paidDate !== undefined, {
        message: 'Informe ao menos um campo para atualizar',
    });

export const tenantPaymentParamsSchema = z.object({
    tenantId: z.uuid('Identificador da empresa inválido'),
    paymentId: z.uuid('Identificador do pagamento inválido'),
});

export type CreateMasterTenantInput = z.infer<typeof createMasterTenantSchema>;
export type UpdateMasterTenantInput = z.infer<typeof updateMasterTenantSchema>;
export type CreateTenantPaymentInput = z.infer<typeof createTenantPaymentSchema>;
export type UpdateTenantPaymentInput = z.infer<typeof updateTenantPaymentSchema>;
