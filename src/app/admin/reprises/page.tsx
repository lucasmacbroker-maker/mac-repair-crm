"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BuybackStatusBadge } from "@/components/ui/BuybackStatusBadge";
import { dropOffLabel, formatEuro, paymentDeadline } from "@/lib/buyback";

interface BuybackRow {
  id: string;
  reference: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
  macModel: string;
  condition: string;
  offerAmount: number;
  counterOfferAmount: number | null;
  counterOfferStatus: string;
  finalAmount: number;
  dropOffMode: string;
  requestedDate: string | null;
  requestedSlot: string;
  appointmentDate: string | null;
  status: string;
  receivedAt: string | null;
  createdAt: string;
}

const modeOptions = [
  { value: "", label: "Tous les modes" },
  { value: "POSTAL", label: "Envoi postal" },
  { value: "LOCAL", label: "Dépôt atelier" },
];

const shortDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const shortDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Montant de référence : offre finale, contre-offre en cours ou offre initiale. */
function amountOf(b: BuybackRow) {
  if (b.finalAmount > 0) return b.finalAmount;
  if (b.counterOfferAmount != null && b.counterOfferStatus !== "REFUSED") return b.counterOfferAmount;
  return b.offerAmount;
}

function Deadline({ b }: { b: BuybackRow }) {
  const deadline = paymentDeadline(b.receivedAt);
  if (!deadline || ["PAID", "RETURNED", "CANCELLED", "OFFER_REFUSED"].includes(b.status)) return <span className="text-gray-300">—</span>;
  const hoursLeft = (deadline.getTime() - Date.now()) / 3600000;
  const tone = hoursLeft < 0 ? "text-red-600 font-semibold" : hoursLeft < 12 ? "text-orange-600 font-medium" : "text-gray-700";
  return (
    <span className={tone}>
      {hoursLeft < 0 ? "En retard — " : ""}
      {shortDateTime(deadline)}
    </span>
  );
}

export default function BuybacksPage() {
  const [group, setGroup] = useState<"active" | "closed">("active");
  const [mode, setMode] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<BuybackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ group });
    if (mode) params.set("mode", mode);
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/reprises?${params}`);
      const data = await res.json();
      setRows(data.buybacks || []);
    } finally {
      setLoading(false);
    }
  }, [group, mode, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const toPay = rows.filter((r) => r.receivedAt && ["RECEIVED", "CHECKING", "VALIDATED"].includes(r.status)).length;
  const toPlan = rows.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reprises</h1>
          <p className="text-sm text-gray-500">Mac rachetés via reprise.macplace.fr</p>
        </div>
        {group === "active" && (
          <p className="text-sm text-gray-600">
            {toPlan} à traiter · {toPay} à payer sous 48 h
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {(["active", "closed"] as const).map((g) => (
            <button
              key={g}
              onClick={() => {
                setLoading(true);
                setGroup(g);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${group === g ? "bg-[#1d1d1f] text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {g === "active" ? "En cours" : "Clôturées"}
            </button>
          ))}
        </div>
        <div className="w-full lg:w-48">
          <Select options={modeOptions} value={mode} onChange={(e) => setMode(e.target.value)} />
        </div>
        <div className="w-full lg:max-w-xs">
          <Input placeholder="Référence, client, modèle, n° de série…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title={group === "active" ? "Aucune reprise en cours" : "Aucune reprise clôturée"} description="Les demandes envoyées depuis le site de reprise apparaissent ici." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-5 py-3 font-medium">Référence</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Mac</th>
                <th className="px-5 py-3 font-medium text-right">Offre</th>
                <th className="px-5 py-3 font-medium">Remise</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium">Payer avant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/admin/reprises/${b.id}`} className="font-medium text-[#0071e3] hover:underline">
                      {b.reference}
                    </Link>
                    <div className="text-xs text-gray-400">{shortDate(b.createdAt)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">
                      {b.clientFirstName} {b.clientLastName}
                    </div>
                    <div className="text-xs text-gray-500">{b.clientPhone}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-gray-900">{b.macModel}</div>
                    <div className="text-xs text-gray-500">{b.condition}</div>
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{formatEuro(amountOf(b))}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${b.dropOffMode === "LOCAL" ? "bg-orange-50 text-orange-700" : "bg-purple-50 text-purple-700"}`}>
                      {dropOffLabel(b.dropOffMode)}
                    </span>
                    {b.dropOffMode === "LOCAL" && (b.appointmentDate || b.requestedDate) && (
                      <div className="mt-1 text-xs text-gray-500">
                        {b.appointmentDate ? `RDV ${shortDateTime(b.appointmentDate)}` : `Souhaité ${shortDate(b.requestedDate!)}`}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <BuybackStatusBadge status={b.status} mode={b.dropOffMode} />
                  </td>
                  <td className="px-5 py-3">
                    <Deadline b={b} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
