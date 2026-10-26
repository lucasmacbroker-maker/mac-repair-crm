"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface Quote {
  id: string;
  token: string;
  clientFirstName: string;
  clientLastName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  macModel: string;
  serialNumber: string;
  faultType: string;
  faultDescription: string;
  estimatedCost: number;
  notes: string;
  validUntil: string | null;
  status: string;
  location: string;
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
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  SENT: "bg-blue-100 text-blue-700 border-blue-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  REFUSED: "bg-red-100 text-red-700 border-red-200",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-[#86868b] w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#1d1d1f] flex-1">{value || "—"}</span>
    </div>
  );
}

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      setQuote(await res.json());
    } catch {
      toast.error("Devis introuvable");
      router.push("/admin/quotes");
    } finally {
      setLoading(false);
    }
  }, [params.id, router, toast]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  const handleSend = async () => {
    setActionLoading("send");
    try {
      const res = await fetch(`/api/quotes/${params.id}/send`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur lors de l'envoi");
      toast.success("Devis envoyé par email ✓");
      fetchQuote();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatus = async (status: string) => {
    setActionLoading(status);
    try {
      const res = await fetch(`/api/quotes/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Statut mis à jour ✓");
      fetchQuote();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/quotes/${params.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Devis supprimé");
      router.push("/admin/quotes");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded-xl w-48" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const isSent = quote.status !== "DRAFT";
  const clientName = `${quote.clientFirstName} ${quote.clientLastName}`;
  const ttc = quote.estimatedCost * 1.2;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-sm text-[#86868b] hover:text-[#1d1d1f] mb-3 flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#1d1d1f]">{clientName}</h1>
            <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${STATUS_COLORS[quote.status] || STATUS_COLORS.DRAFT}`}>
              {STATUS_LABELS[quote.status] || quote.status}
            </span>
          </div>
          <p className="text-sm text-[#86868b] mt-1">{quote.macModel} · Créé le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {quote.status === "SENT" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => handleStatus("ACCEPTED")} disabled={!!actionLoading}>
                {actionLoading === "ACCEPTED" ? "..." : "Marquer accepté"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleStatus("REFUSED")} disabled={!!actionLoading}>
                {actionLoading === "REFUSED" ? "..." : "Marquer refusé"}
              </Button>
            </>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!!actionLoading || quote.status === "ACCEPTED" || quote.status === "REFUSED"}
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {actionLoading === "send" ? "Envoi..." : isSent ? "Renvoyer" : "Envoyer"}
          </Button>
        </div>
      </div>

      {/* Client */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Client</h2>
        <Row label="Nom" value={clientName} />
        {quote.clientCompany && <Row label="Société" value={quote.clientCompany} />}
        <Row label="Email" value={<a href={`mailto:${quote.clientEmail}`} className="text-[#0071e3] hover:underline">{quote.clientEmail}</a>} />
        <Row label="Téléphone" value={<a href={`tel:${quote.clientPhone}`} className="text-[#0071e3] hover:underline">{quote.clientPhone}</a>} />
        {quote.clientAddress && <Row label="Adresse" value={`${quote.clientAddress}${quote.clientPostalCode ? ", " + quote.clientPostalCode : ""}${quote.clientCity ? " " + quote.clientCity : ""}`} />}
      </Card>

      {/* Device */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Appareil</h2>
        <Row label="Modèle" value={quote.macModel} />
        {quote.serialNumber && <Row label="Numéro de série" value={quote.serialNumber} />}
        <Row label="Type de panne" value={quote.faultType} />
        {quote.faultDescription && <Row label="Description" value={quote.faultDescription} />}
      </Card>

      {/* Quote details */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-3">Devis</h2>
        <Row label="Montant HT" value={quote.estimatedCost > 0 ? `${quote.estimatedCost.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : "—"} />
        <Row label="TVA (20%)" value={quote.estimatedCost > 0 ? `${(quote.estimatedCost * 0.2).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €` : "—"} />
        <Row
          label="Total TTC"
          value={quote.estimatedCost > 0 ? (
            <span className="font-semibold text-[#1d1d1f]">{ttc.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          ) : "—"}
        />
        {quote.validUntil && <Row label="Valable jusqu'au" value={new Date(quote.validUntil).toLocaleDateString("fr-FR")} />}
        <Row label="Atelier" value={quote.location === "NICE" ? "Nice" : "Maisons-Alfort"} />
        {quote.sentAt && <Row label="Envoyé le" value={new Date(quote.sentAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />}
        {quote.notes && <Row label="Notes internes" value={quote.notes} />}
      </Card>

      {/* Danger zone */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Supprimer ce devis
        </button>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-[#1d1d1f] mb-2">Supprimer le devis ?</h2>
            <p className="text-sm text-[#86868b] mb-6">
              Cette action est irréversible. Le devis de <strong>{clientName}</strong> sera définitivement supprimé.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowDeleteModal(false)} disabled={!!actionLoading}>
                Annuler
              </Button>
              <Button variant="danger" size="md" className="flex-1" onClick={handleDelete} disabled={!!actionLoading}>
                {actionLoading === "delete" ? "Suppression..." : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
