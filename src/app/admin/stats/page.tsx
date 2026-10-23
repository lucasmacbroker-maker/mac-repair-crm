"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/Loader";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
} from "recharts";

interface Stats {
  // Revenue KPIs
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  avgTicket: number;
  totalCompleted: number;
  // Revenue breakdowns
  revenueByType: { type: string; revenue: number; count: number }[];
  revenueByFault: { faultType: string; revenue: number; count: number }[];
  revenueByMonth: { month: string; revenue: number; count: number }[];
  // Quote stats
  quotesWithPrice: number;
  quotesValidated: number;
  quotesRefused: number;
  // Volume
  totalActive: number;
  completedThisMonth: number;
  // Legacy
  topModels: { model: string; count: number }[];
  stockAlerts: { id: string; name: string; quantity: number; alertThreshold: number }[];
  totalStockValue: number;
  avgRepairDays: number;
}

const TYPE_COLORS: Record<string, string> = {
  POSTAL: "#6366f1",
  LOCAL: "#f59e0b",
  HOME: "#10b981",
};

const TYPE_LABELS: Record<string, string> = {
  POSTAL: "Envoi postal",
  LOCAL: "Atelier",
  HOME: "À domicile",
};

const FAULT_COLORS = ["#0071e3", "#5856d6", "#af52de", "#ff2d55", "#ff9500", "#34c759", "#00c7be", "#32ade6"];

const MONTHS_FR: Record<string, string> = {
  "01": "Jan", "02": "Fév", "03": "Mar", "04": "Avr",
  "05": "Mai", "06": "Juin", "07": "Juil", "08": "Août",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Déc",
};

function formatMonth(s: string) {
  const [, m] = s.split("-");
  return MONTHS_FR[m] || m;
}

function formatEur(v: number, compact = false) {
  if (compact && v >= 1000) {
    return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k€`;
  }
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  accent?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">{label}</span>
        <span className={`p-2 rounded-xl ${accent || "bg-blue-50"}`}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1d1d1f] tracking-tight">{value}</p>
        {sub && <p className="text-xs text-[#86868b] mt-0.5">{sub}</p>}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${delta >= 0 ? "text-green-600" : "text-red-500"}`}>
          <span>{delta >= 0 ? "▲" : "▼"}</span>
          <span>{Math.abs(delta).toFixed(1)}% vs mois dernier</span>
        </div>
      )}
    </Card>
  );
}

const TooltipEur = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-[#1d1d1f] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[#424245]">{p.name} :</span>
          <span className="font-medium text-[#1d1d1f]">
            {p.name.includes("€") || p.name === "CA" ? formatEur(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!stats) return <div className="text-center py-12 text-[#86868b]">Impossible de charger les statistiques.</div>;

  const monthData = stats.revenueByMonth.map((m) => ({
    ...m,
    label: formatMonth(m.month),
  }));

  const pieTypeData = stats.revenueByType
    .filter((t) => t.revenue > 0)
    .map((t) => ({ name: TYPE_LABELS[t.type] || t.type, value: t.revenue, revenue: t.revenue, count: t.count, color: TYPE_COLORS[t.type] || "#888" }));

  const top8Faults = stats.revenueByFault.slice(0, 8);
  const topModels = stats.topModels.slice(0, 6);

  const revDelta =
    stats.revenueLastMonth > 0
      ? ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100
      : null;

  const conversionRate =
    stats.quotesWithPrice > 0
      ? Math.round((stats.quotesValidated / stats.quotesWithPrice) * 100)
      : 0;

  const totalRevByFault = top8Faults.reduce((s, f) => s + f.revenue, 0) || 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Statistiques</h1>
        <p className="text-sm text-[#86868b] mt-1">Vue d&apos;ensemble de l&apos;activité Mac Place</p>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label="Chiffre d'affaires total"
          value={formatEur(stats.totalRevenue, true)}
          sub={`${stats.totalCompleted} réparations facturées`}
          accent="bg-blue-50"
          icon={<svg className="h-5 w-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard
          label="CA ce mois"
          value={formatEur(stats.revenueThisMonth)}
          sub={stats.completedThisMonth + " terminées ce mois"}
          delta={revDelta !== null ? revDelta : undefined}
          accent="bg-green-50"
          icon={<svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <KpiCard
          label="Ticket moyen"
          value={formatEur(stats.avgTicket)}
          sub="par réparation facturée"
          accent="bg-purple-50"
          icon={<svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
        />
        <KpiCard
          label="Taux de conversion"
          value={`${conversionRate}%`}
          sub={`${stats.quotesValidated} devis acceptés / ${stats.quotesWithPrice} envoyés`}
          accent="bg-amber-50"
          icon={<svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Monthly CA chart (full width) ────────────────────────────────────── */}
      <Card className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-[#1d1d1f]">Évolution du chiffre d&apos;affaires</h2>
            <p className="text-xs text-[#86868b] mt-0.5">12 derniers mois — barres CA, courbe volume</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#86868b]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0071e3] inline-block"/>CA (€)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-[#34c759] inline-block rounded"/>Volume</span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#86868b" }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#86868b" }}
                tickFormatter={(v) => formatEur(v, true)}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#86868b" }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip content={<TooltipEur />} />
              <Bar yAxisId="left" dataKey="revenue" name="CA" fill="#0071e3" radius={[6, 6, 0, 0]} maxBarSize={48} />
              <Line yAxisId="right" type="monotone" dataKey="count" name="Volume" stroke="#34c759" strokeWidth={2.5} dot={{ fill: "#34c759", r: 3 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── CA par type + CA par panne ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* CA par type de réparation */}
        <Card>
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-1">CA par type de réparation</h2>
          <p className="text-xs text-[#86868b] mb-4">Répartition du chiffre d&apos;affaires en €</p>
          {pieTypeData.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-8">Aucune donnée</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieTypeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [formatEur(Number(v) || 0), "CA"]}
                      contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                    />
                    <Legend
                      formatter={(value) => <span className="text-xs text-[#424245]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 divide-y divide-gray-50">
                {pieTypeData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                      <span className="text-sm text-[#424245]">{t.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#1d1d1f]">{formatEur(t.revenue)}</p>
                      <p className="text-xs text-[#86868b]">{t.count} réparations</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* CA par type de panne */}
        <Card>
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-1">CA par type de panne</h2>
          <p className="text-xs text-[#86868b] mb-4">Segments les plus rentables (€)</p>
          {top8Faults.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-8">Aucune donnée</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top8Faults.map((f) => ({ ...f, label: f.faultType.length > 18 ? f.faultType.slice(0, 16) + "…" : f.faultType }))}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f7" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#86868b" }}
                    tickFormatter={(v) => formatEur(v, true)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fontSize: 11, fill: "#424245" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => [name === "revenue" ? formatEur(Number(v) || 0) : v, name === "revenue" ? "CA" : "Nb"]}
                    contentStyle={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: "13px" }}
                  />
                  <Bar dataKey="revenue" name="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {top8Faults.map((_, i) => (
                      <Cell key={i} fill={FAULT_COLORS[i % FAULT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Revenue share bars */}
          <div className="mt-4 space-y-2">
            {top8Faults.slice(0, 4).map((f, i) => (
              <div key={f.faultType}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#424245]">{f.faultType}</span>
                  <span className="font-medium text-[#1d1d1f]">{Math.round((f.revenue / totalRevByFault) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(f.revenue / totalRevByFault) * 100}%`, background: FAULT_COLORS[i] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Bottom row: models + operational ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Mac models */}
        <Card>
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-4">Modèles Mac</h2>
          {topModels.length === 0 ? (
            <p className="text-sm text-[#86868b] text-center py-4">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {topModels.map((m, i) => {
                const max = topModels[0]?.count || 1;
                const medals = ["text-amber-500", "text-gray-400", "text-orange-600"];
                return (
                  <div key={m.model}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${medals[i] || "text-gray-400"}`}>#{i + 1}</span>
                        <span className="text-sm text-[#424245]">{m.model}</span>
                      </div>
                      <span className="text-sm font-medium text-[#1d1d1f]">{m.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0071e3] rounded-full"
                        style={{ width: `${(m.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Conversion devis */}
        <Card>
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-4">Conversion des devis</h2>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f5f5f7" strokeWidth="12" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke="#34c759"
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 50 * conversionRate / 100} ${2 * Math.PI * 50 * (1 - conversionRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#1d1d1f]">{conversionRate}%</span>
                <span className="text-xs text-[#86868b]">acceptés</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400"/>
                <span className="text-sm text-[#424245]">Devis acceptés</span>
              </div>
              <span className="text-sm font-semibold text-[#1d1d1f]">{stats.quotesValidated}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400"/>
                <span className="text-sm text-[#424245]">Devis refusés</span>
              </div>
              <span className="text-sm font-semibold text-[#1d1d1f]">{stats.quotesRefused}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300"/>
                <span className="text-sm text-[#424245]">Devis envoyés</span>
              </div>
              <span className="text-sm font-semibold text-[#1d1d1f]">{stats.quotesWithPrice}</span>
            </div>
          </div>
        </Card>

        {/* Operational */}
        <Card>
          <h2 className="text-base font-semibold text-[#1d1d1f] mb-4">Opérationnel</h2>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-50">
              <p className="text-xs text-[#86868b] mb-1">Temps moyen de réparation</p>
              <p className="text-xl font-bold text-[#0071e3]">{stats.avgRepairDays} <span className="text-sm font-normal">jours</span></p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-[#86868b] mb-1">Réparations en cours</p>
              <p className="text-xl font-bold text-[#1d1d1f]">{stats.totalActive}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50">
              <p className="text-xs text-[#86868b] mb-1">Valeur stock pièces</p>
              <p className="text-xl font-bold text-[#1d1d1f]">{formatEur(stats.totalStockValue)}</p>
            </div>
            {stats.stockAlerts.length > 0 && (
              <div className="p-3 rounded-xl bg-red-50">
                <p className="text-xs font-semibold text-red-600 mb-1">⚠ {stats.stockAlerts.length} alerte{stats.stockAlerts.length > 1 ? "s" : ""} stock</p>
                {stats.stockAlerts.slice(0, 2).map((a) => (
                  <p key={a.id} className="text-xs text-red-500">{a.name} — {a.quantity} restant{a.quantity > 1 ? "s" : ""}</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
