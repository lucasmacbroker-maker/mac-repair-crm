"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface Quote {
  id: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  macModel: string;
  faultType: string;
  estimatedCost: number;
  status: string;
  createdAt: string;
  sentAt: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REFUSED: "Refusé",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REFUSED: "bg-red-100 text-red-700",
};

export default function QuotesPage() {
  const router = useRouter();
  const toast = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/quotes?${params}`);
      const data = await res.json();
      setQuotes(data.quotes || []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/quotes/${deleteId}`, { method: "DELETE" });
      toast.success("Devis supprimé");
      setDeleteId(null);
      fetchQuotes();
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const statusTabs = [
    { key: "", label: "Tous" },
    { key: "DRAFT", label: "Brouillons" },
    { key: "SENT", label: "Envoyés" },
    { key: "ACCEPTED", label: "Acceptés" },
    { key: "REFUSED", label: "Refusés" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight">Devis</h1>
          <p className="text-sm text-[#86868b] mt-1">{quotes.length} devis</p>
        </div>
        <Link href="/admin/quotes/new">
          <Button variant="primary" size="sm">
            <svg className="h-4 w-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nouveau devis</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-[#f5f5f7] p-1 rounded-xl w-fit flex-wrap">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === t.key
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-[#86868b] hover:text-[#1d1d1f]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5 max-w-sm">
        <Input
          placeholder="Rechercher (nom, email...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-[#86868b]">Chargement...</div>
      ) : quotes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-sm text-[#86868b] mb-4">Aucun devis trouvé</p>
            <Link href="/admin/quotes/new">
              <Button variant="primary" size="sm">Créer un devis</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="cursor-pointer" onClick={() => router.push(`/admin/quotes/${q.id}`)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1d1d1f]">{q.clientFirstName} {q.clientLastName}</p>
                    <p className="text-xs text-[#86868b]">{q.clientPhone}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>
                    {STATUS_LABELS[q.status]}
                  </span>
                </div>
                <p className="text-xs text-[#424245]">{q.macModel}{q.faultType ? ` · ${q.faultType}` : ""}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    {q.estimatedCost > 0 ? `${q.estimatedCost.toFixed(2)} €` : "—"}
                  </span>
                  <span className="text-xs text-[#86868b]">{new Date(q.createdAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card padding="none" className="hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Modèle</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Type de panne</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Montant</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Statut</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/quotes/${q.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-[#1d1d1f]">{q.clientFirstName} {q.clientLastName}</p>
                      <p className="text-xs text-[#86868b]">{q.clientPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#424245]">{q.macModel}</td>
                    <td className="px-4 py-3 text-sm text-[#424245]">{q.faultType || <span className="text-[#86868b]">—</span>}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#1d1d1f]">
                      {q.estimatedCost > 0 ? `${q.estimatedCost.toFixed(2)} €` : <span className="text-[#86868b] font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.status]}`}>
                        {STATUS_LABELS[q.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#86868b]">
                      {new Date(q.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/quotes/${q.id}`} onClick={(e) => e.stopPropagation()} className="text-[#0071e3] hover:text-[#0077ed] text-sm font-medium">
                          Voir
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(q.id); }}
                          className="text-red-400 hover:text-red-600 text-sm font-medium"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {deleteId && (
        <Modal isOpen={!!deleteId} title="Supprimer ce devis ?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-[#424245] mb-6">Cette action est irréversible.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="primary" size="sm" onClick={handleDelete} disabled={deleting} className="!bg-red-500 hover:!bg-red-600">
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
