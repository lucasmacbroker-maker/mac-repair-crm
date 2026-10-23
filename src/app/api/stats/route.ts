import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const TERMINAL = ["DONE", "CLOSED"];

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

    // ── Revenue KPIs ──────────────────────────────────────────────────────────
    const [
      totalRevenueResult,
      revenueThisMonthResult,
      revenueLastMonthResult,
      totalCompleted,
    ] = await Promise.all([
      prisma.repair.aggregate({
        _sum: { finalCost: true },
        where: { status: { in: TERMINAL } },
      }),
      prisma.repair.aggregate({
        _sum: { finalCost: true },
        where: {
          status: { in: TERMINAL },
          closedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.repair.aggregate({
        _sum: { finalCost: true },
        where: {
          status: { in: TERMINAL },
          closedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      prisma.repair.count({ where: { status: { in: TERMINAL } } }),
    ]);

    const totalRevenue = totalRevenueResult._sum.finalCost || 0;
    const revenueThisMonth = revenueThisMonthResult._sum.finalCost || 0;
    const revenueLastMonth = revenueLastMonthResult._sum.finalCost || 0;
    const avgTicket = totalCompleted > 0 ? totalRevenue / totalCompleted : 0;

    // ── Revenue by repair type ────────────────────────────────────────────────
    const revenueByTypeRaw = await prisma.repair.groupBy({
      by: ["repairType"],
      _sum: { finalCost: true },
      _count: { id: true },
      where: { status: { in: TERMINAL } },
    });
    const revenueByType = revenueByTypeRaw.map((r) => ({
      type: r.repairType,
      revenue: r._sum.finalCost || 0,
      count: r._count.id,
    }));

    // ── Revenue by fault type ─────────────────────────────────────────────────
    const revenueByFaultRaw = await prisma.repair.groupBy({
      by: ["faultType"],
      _sum: { finalCost: true },
      _count: { id: true },
      where: { status: { in: TERMINAL } },
      orderBy: { _sum: { finalCost: "desc" } },
    });
    const revenueByFault = revenueByFaultRaw.map((r) => ({
      faultType: r.faultType,
      revenue: r._sum.finalCost || 0,
      count: r._count.id,
    }));

    // ── Monthly trend (revenue + count, last 12 months) ───────────────────────
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const allClosedForMonths = await prisma.repair.findMany({
      where: {
        status: { in: TERMINAL },
        closedAt: { gte: twelveMonthsAgo },
      },
      select: { closedAt: true, createdAt: true, finalCost: true },
    });

    const revenueByMonth: { month: string; revenue: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      const items = allClosedForMonths.filter((r) => {
        const date = r.closedAt || r.createdAt;
        return date.getFullYear() === year && date.getMonth() === month;
      });
      revenueByMonth.push({
        month: key,
        revenue: Math.round(items.reduce((s, r) => s + (r.finalCost || 0), 0) * 100) / 100,
        count: items.length,
      });
    }

    // ── Quote conversion ──────────────────────────────────────────────────────
    const [quotesWithPrice, quotesValidated, quotesRefused] = await Promise.all([
      prisma.repair.count({ where: { estimatedCost: { gt: 0 } } }),
      prisma.repair.count({ where: { quoteValidated: true } }),
      prisma.repair.count({ where: { status: "QUOTE_REFUSED" } }),
    ]);

    // ── Volume KPIs ───────────────────────────────────────────────────────────
    const [totalActive, postalActive, localActive, completedThisMonth] = await Promise.all([
      prisma.repair.count({ where: { status: { notIn: [...TERMINAL, "QUOTE_REFUSED"] } } }),
      prisma.repair.count({ where: { status: { notIn: [...TERMINAL, "QUOTE_REFUSED"] }, repairType: "POSTAL" } }),
      prisma.repair.count({ where: { status: { notIn: [...TERMINAL, "QUOTE_REFUSED"] }, repairType: "LOCAL" } }),
      prisma.repair.count({
        where: { status: { in: TERMINAL }, closedAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
    ]);

    // ── Repairs by fault type (volume) ────────────────────────────────────────
    const repairsByFaultRaw = await prisma.repair.groupBy({
      by: ["faultType"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    const repairsByFault = repairsByFaultRaw.map((r) => ({
      faultType: r.faultType,
      count: r._count.id,
    }));

    // ── Repairs by month (volume, for backwards compat) ───────────────────────
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
      completedThisMonth,
      // Legacy fields
      repairsByFault,
      repairsByMonth,
      repairsByType: revenueByTypeRaw.map((r) => ({ type: r.repairType, count: r._count.id })),
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
