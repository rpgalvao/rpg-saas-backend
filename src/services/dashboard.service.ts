import { prisma } from "../libs/prisma";

export const getDashboardMetrics = async () => {
    // 1. MÉTRICAS DOS CARDS
    const openOrders = await prisma.serviceOrder.count({ where: { status: 'ABERTA' } });
    const completedOS = await prisma.serviceOrder.count({ where: { status: 'FINALIZADA' } });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const finishedOrdersThisMonth = await prisma.serviceOrder.count({
        where: {
            status: 'FINALIZADA',
            updated_at: { gte: startOfMonth }
        }
    });

    const totalEquipments = await prisma.equipment.count();

    // ==========================================
    // 2. DADOS DO GRÁFICO DE BARRAS (Últimos 6 meses)
    // ==========================================
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentOrders = await prisma.serviceOrder.findMany({
        where: {
            OR: [
                { opened_at: { gte: sixMonthsAgo } },
                { updated_at: { gte: sixMonthsAgo } }
            ]
        },
        select: { opened_at: true, updated_at: true, closed_at: true, status: true }
    });

    const chartData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);

        const targetMonth = d.getMonth();
        const targetYear = d.getFullYear();
        const monthName = d.toLocaleString('pt-BR', { month: 'short' });

        const abertasNoMes = recentOrders.filter((order: any) =>
            order.opened_at.getMonth() === targetMonth &&
            order.opened_at.getFullYear() === targetYear
        ).length;

        const finalizadasNoMes = recentOrders.filter((order: any) => {
            if (order.status !== 'FINALIZADA') return false;
            const dateToConsider = order.closed_at ? order.closed_at : order.updated_at;
            return dateToConsider.getMonth() === targetMonth &&
                dateToConsider.getFullYear() === targetYear;
        }).length;

        chartData.push({
            name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            abertas: abertasNoMes,
            finalizadas: finalizadasNoMes,
        });
    }

    // ==========================================
    // 3. MÉTRICAS DE PERFORMANCE POR TÉCNICO
    // ==========================================
    const technicianPerformanceRaw = await prisma.serviceOrder.findMany({
        where: {
            status: 'FINALIZADA',
            closed_at: { not: null },
            closedById: { not: null }
        },
        select: {
            opened_at: true,
            closed_at: true,
            closedBy: { select: { name: true } }
        }
    });

    const technicianStats: Record<string, { count: number, totalTimeHours: number; }> = {};

    technicianPerformanceRaw.forEach(os => {
        const techName = os.closedBy?.name || 'Desconhecido';
        if (!technicianStats[techName]) {
            technicianStats[techName] = { count: 0, totalTimeHours: 0 };
        }

        technicianStats[techName].count += 1;

        // Calcula a diferença em horas entre abertura e fechamento
        const diffMs = os.closed_at!.getTime() - os.opened_at.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        technicianStats[techName].totalTimeHours += diffHours;
    });

    const techMetrics = Object.entries(technicianStats)
        .map(([name, stats]) => ({
            name,
            osCount: stats.count,
            avgResolutionTimeHours: Math.round(stats.totalTimeHours / stats.count)
        }))
        .sort((a, b) => b.osCount - a.osCount); // Ordena pelos que mais fecharam O.S.

    // ==========================================
    // 4. ATIVIDADES RECENTES
    // ==========================================
    const recentActivities = await prisma.serviceOrder.findMany({
        take: 5,
        orderBy: { updated_at: 'desc' },
        select: {
            id: true,
            number: true,
            status: true,
            updated_at: true,
            equipment: { select: { model: { select: { name: true } } } },
            customer: { select: { name: true } }
        }
    });

    return {
        openOrders,
        completedOS,
        totalEquipments,
        finishedOrdersThisMonth,
        chartData,
        techMetrics, // 🟢 NOVA MÉTRICA DEVOLVIDA
        recentActivities
    };
};