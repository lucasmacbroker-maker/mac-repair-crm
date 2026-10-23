import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const TERMINAL = ["DONE", "CLOSED"];

function repairRevenue(r: { finalCost: number; estimatedCost: number }): number {
  return r.finalCost > 0 ? r.finalCost : r.estimatedCost;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

    const now = new Date();

    // Date range for filtering (defaults to all time)
    const filterFrom = dateFromParam ? new Date(dateFromParam) : null;
    const filterTo = dateToParam ? new Date(dateToParam + "T23:59:59.999Z") : null;

    // For "previous period" delta: same duration before filterFrom
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // ── Fetch all completed repairs (optionally filtered by date) ─────────────
    const dateWhere = filterFrom || filterTo
      ? {
          OR: [
            { closedAt: { gte: filterFrom ?? undefined, lte: filterTo ?? undefined } },
            { closedAt: null, updatedAt: { gte: filterFrom ?? undefined, lte: filterTo ?? undefined } },
          ],
        }
      : {};

    const completedRepairs = await prisma.repair.findMany({
      where: { status: { in: TERMINAL }, ...dateWhere },
      select: {
        id: true,
        repairType: true,
        faultType: true,
        finalCost: true,
        estimatedCost: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCompleted = completedRepairs.length;
    const totalRevenue = completedRepairs.reduce((s, r) => s + repairRevenue(r), 0);
    const avgTicket = totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

    // Previous period delta (always uses current month vs last month for the KPI card)
    const inMonth = (r: { closedAt: Date | null; updatedAt: Date }, from: Date, to: Date) => {
      const d = r.closedAt || r.updatedAt;
      return d >= from && d <= to;
    };
    // When date filter is active, compute current vs previous period of same length
    let revenueCurrentPeriod = 0;
    let revenuePreviousPeriod = 0;
    if (filterFrom && filterTo) {
      const durationMs = filterTo.getTime() - filterFrom.getTime();
      const prevFrom = new Date(filterFrom.getTime() - durationMs);
      const prevTo = new Date(filterFrom.getTime() - 1);
      revenueCurrentPeriod = totalRevenue;
      const prevRepairs = await prisma.repair.findMany({
        where: {
          status: { in: TERMINAL },
          OR: [
            { closedAt: { gte: prevFrom, lte: prevTo } },
            { closedAt: null, updatedAt: { gte: prevFrom, lte: prevTo } },
          ],
        },
        select: { finalCost: true, estimatedCost: true },
      });
      revenuePreviousPeriod = prevRepairs.reduce((s, r) => s + repairRevenue(r), 0);
    } else {
      revenueCurrentPeriod = completedRepairs
        .filter((r) => inMonth(r, startOfMonth, endOfMonth))
        .reduce((s, r) => s + repairRevenue(r), 0);
      revenuePreviousPeriod = completedRepairs
        .filter((r) => inMonth(r, startOfLastMonth, endOfLastMonth))
        .reduce((s, r) => s + repairRevenue(r), 0);
    }

    // ── Revenue by repair type ────────────────────────────────────────────────
    const typeMap = new Map<string, { revenue: number; count: number }>();
    for (const r of completedRepairs) {
      const cur = typeMap.get(r.repairType) || { revenue: 0, count: 0 };
      typeMap.set(r.repairType, { revenue: cur.revenue + repairRevenue(r), count: cur.count + 1 });
    }
    const revenueByType = Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v }));

    // ── Revenue by fault type ─────────────────────────────────────────────────
    const faultMap = new Map<string, { revenue: number; count: number }>();
    for (const r of completedRepairs) {
      const cur = faultMap.get(r.faultType) || { revenue: 0, count: 0 };
      faultMap.set(r.faultType, { revenue: cur.revenue + repairRevenue(r), count: cur.count + 1 });
    }
    const revenueByFault = Array.from(faultMap.entries())
      .map(([faultType, v]) => ({ faultType, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Monthly trend ─────────────────────────────────────────────────────────
    // Determine range for the chart: use filter range or last 12 months
    const chartEnd = filterTo || now;
    const chartStart = filterFrom || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    
    // Build month buckets between chartStart and chartEnd (max 24)
    const months: { year: number; month: number; key: string }[] = [];
    const cur = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1);
    const end = new Date(chartEnd.getFullYear(), chartEnd.getMonth(), 1);
    while (cur <= end && months.length < 24) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth(),
        key: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    const revenueByMonth = months.map(({ year, month, key }) => {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const items = completedRepairs.filter((r) => inMonth(r, from, to));
      return {
        month: key,
        revenue: Math.round(items.reduce((s, r) => s + repairRevenue(r), 0) * 100) / 100,
        count: items.length,
      };
    });

    // ── Quote conversion ──────────────────────────────────────────────────────
    const createdWhere = filterFrom || filterTo
      ? { createdAt: { gte: filterFrom ?? undefined, lte: filterTo ?? undefined } }
      : {};

    const [quotesWithPrice, quotesValidated, quotesRefused] = await Promise.all([
      prisma.repair.count({ where: { estimatedCost: { gt: 0 }, ...createdWhere } }),
      prisma.repair.count({ where: { status: { in: TERMINAL }, estimatedCost: { gt: 0 }, ...dateWhere } }),
      prisma.repair.count({ where: { status: "QUOTE_REFUSED", ...dateWhere } }),
    ]);

    // ── Volume KPIs ───────────────────────────────────────────────────────────
    const [totalActive, postalActive, localActive, completedThisMonthCount] = await Promise.all([
      prisma.repair.count({ where: { status: { notIn: [...TERMINAL, "QUOTE_REFUSED"] } } }),
      prisma.repair.count({ where: { status: { notIn: [...TERMINAL, "QUOTE_REFUSED"] }, repairType: "POSTAL" } }),
      prisma.repair.count({ where: { status: { notIn: [...TERMINAL, "QUOTE_REFUSED"] }, repairType: "LOCAL" } }),
      prisma.repair.count({
        where: {
          status: { in: TERMINAL },
          OR: [
            { closedAt: { gte: startOfMonth, lte: endOfMonth } },
            { updatedAt: { gte: startOfMonth, lte: endOfMonth }, closedAt: null },
          ],
        },
      }),
    ]);

    // ── Repairs by fault type (volume) ────────────────────────────────────────
    const repairsByFaultRaw = await prisma.repair.groupBy({
      by: ["faultType"],
      _count: { id: true },
      where: Object.keys(createdWhere).length ? createdWhere : undefined,
      orderBy: { _count: { id: "desc" } },
    });
    const repairsByFault = repairsByFaultRaw.map((r) => ({ faultType: r.faultType, count: r._count.id }));

    // ── Repairs by month (volume, created) ────────────────────────────────────
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const allRepairsForMonths = await prisma.repair.findMany({
      where: { createdAt: { gte: filterFrom || twelveMonthsAgo, lte: filterTo || undefined } },
      select: { createdAt: true },
    });
    const repairsByMonth = months.map(({ year, month, key }) => {
      const count = allRepairsForMonths.filter(
        (r) => r.createdAt.getFullYear() === year && r.createdAt.getMonth() === month
      ).length;
      return { month: key, count };
    });

    // ── Top Mac models ────────────────────────────────────────────────────────
    const topModelsRaw = await prisma.repair.groupBy({
      by: ["macModel"],
      _count: { id: true },
      where: Object.keys(createdWhere).length ? createdWhere : undefined,
      orderBy: { _count: { id: "desc" } },
      take: 8,
    });
    const topModels = topModelsRaw.map((r) => ({ model: r.macModel, count: r._count.id }));

    // ── Avg repair days ───────────────────────────────────────────────────────
    const closedRepairs = await prisma.repair.findMany({
      where: { closedAt: { not: null }, ...dateWhere },
      select: { createdAt: true, closedAt: true },
    });
    let avgRepairDays = 0;
    if (closedRepairs.length > 0) {
      const totalDays = closedRepairs.reduce((sum, r) => {
        const diff = r.closedAt!.getTime() - r.createdAt.getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgRepairDays = Math.round((totalDays / closedRepairs.length) * 10) / 10;
    }

    // ── Stock ─────────────────────────────────────────────────────────────────
    const allParts = await prisma.part.findMany({
      select: { id: true, name: true, sku: true, category: true, quantity: true, alertThreshold: true },
    });
    const stockAlerts = allParts.filter((p) => p.quantity <= p.alertThreshold);
    const totalStockValue = (await prisma.part.findMany({ select: { quantity: true, purchasePrice: true } }))
      .reduce((s, p) => s + p.quantity * p.purchasePrice, 0);

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueThisMonth: Math.round(revenueCurrentPeriod * 100) / 100,
      revenueLastMonth: Math.round(revenuePreviousPeriod * 100) / 100,
      avgTicket: Math.round(avgTicket * 100) / 100,
      totalCompleted,
      revenueByType,
      revenueByFault,
      revenueByMonth,
      quotesWithPrice,
      quotesValidated,
      quotesRefused,
      totalActive,
      postalActive,
      localActive,
      completedThisMonth: completedThisMonthCount,
      repairsByFault,
      repairsByMonth,
      repairsByType: revenueByType.map((r) => ({ type: r.type, count: r.count })),
      topModels,
      stockAlerts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      avgRepairDays,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
