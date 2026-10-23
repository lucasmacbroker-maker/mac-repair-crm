import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const TERMINAL = ["DONE", "CLOSED"];

/** Revenue for a repair: prefer finalCost if set, otherwise estimatedCost */
function repairRevenue(r: { finalCost: number; estimatedCost: number }): number {
  return r.finalCost > 0 ? r.finalCost : r.estimatedCost;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // ── Fetch all completed repairs for revenue calculations ──────────────────
    const completedRepairs = await prisma.repair.findMany({
      where: { status: { in: TERMINAL } },
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

    // Monthly revenue filter helper
    const inMonth = (r: { closedAt: Date | null; updatedAt: Date }, from: Date, to: Date) => {
      const d = r.closedAt || r.updatedAt;
      return d >= from && d <= to;
    };

    const revenueThisMonth = completedRepairs
      .filter((r) => inMonth(r, startOfMonth, endOfMonth))
      .reduce((s, r) => s + repairRevenue(r), 0);

    const revenueLastMonth = completedRepairs
      .filter((r) => inMonth(r, startOfLastMonth, endOfLastMonth))
      .reduce((s, r) => s + repairRevenue(r), 0);

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

    // ── Monthly trend (last 12 months) ────────────────────────────────────────
    const revenueByMonth: { month: string; revenue: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1);
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const items = completedRepairs.filter((r) => inMonth(r, from, to));
      revenueByMonth.push({
        month: key,
        revenue: Math.round(items.reduce((s, r) => s + repairRevenue(r), 0) * 100) / 100,
        count: items.length,
      });
    }

    // ── Quote conversion ──────────────────────────────────────────────────────
    const [quotesWithPrice, quotesValidated, quotesRefused] = await Promise.all([
      prisma.repair.count({ where: { estimatedCost: { gt: 0 } } }),
      // Count completed repairs with a price as "accepted" (implicit conversion)
      prisma.repair.count({ where: { status: { in: TERMINAL }, estimatedCost: { gt: 0 } } }),
      prisma.repair.count({ where: { status: "QUOTE_REFUSED" } }),
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

    // ── Repairs by fault type (volume, all time) ──────────────────────────────
    const repairsByFaultRaw = await prisma.repair.groupBy({
      by: ["faultType"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    const repairsByFault = repairsByFaultRaw.map((r) => ({ faultType: r.faultType, count: r._count.id }));

    // ── Repairs by month (volume, all created) ────────────────────────────────
    const allRepairsForMonths = await prisma.repair.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });
    const repairsByMonth: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const count = allRepairsForMonths.filter(
        (r) => r.createdAt.getFullYear() === year && r.createdAt.getMonth() === month
      ).length;
      repairsByMonth.push({ month: key, count });
    }

    // ── Top Mac models ────────────────────────────────────────────────────────
    const topModelsRaw = await prisma.repair.groupBy({
      by: ["macModel"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    });
    const topModels = topModelsRaw.map((r) => ({ model: r.macModel, count: r._count.id }));

    // ── Avg repair days ───────────────────────────────────────────────────────
    const closedRepairs = await prisma.repair.findMany({
      where: { closedAt: { not: null } },
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
      // Revenue KPIs
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      revenueLastMonth: Math.round(revenueLastMonth * 100) / 100,
      avgTicket: Math.round(avgTicket * 100) / 100,
      totalCompleted,
      // Revenue breakdowns
      revenueByType,
      revenueByFault,
      revenueByMonth,
      // Quote stats
      quotesWithPrice,
      quotesValidated,
      quotesRefused,
      // Volume
      totalActive,
      postalActive,
      localActive,
      completedThisMonth: completedThisMonthCount,
      // Legacy
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
