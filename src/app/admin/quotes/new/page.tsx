"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { MAC_MODELS, FAULT_TYPES } from "@/lib/constants";

interface QuoteLine {
  description: string;
  faultType: string;
  amountTTC: string;
}

const macModelOptions = [
  { value: "", label: "Sélectionnez un modèle" },
  ...MAC_MODELS.map((m) => ({ value: m, label: m })),
];

const faultTypeOptions = [
  { value: "", label: "Type de panne (optionnel)" },
  ...FAULT_TYPES.map((f) => ({ value: f, label: f })),
];

const locationOptions = [
  { value: "PARIS", label: "Maisons-Alfort" },
  { value: "NICE", label: "Nice" },
];

const emptyLine = (): QuoteLine => ({ description: "", faultType: "", amountTTC: "" });

export default function NewQuotePage() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientFirstName: "",
    clientLastName: "",
    clientCompany: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    clientCity: "",
    clientPostalCode: "",
    macModel: "",
    serialNumber: "",
    notes: "",
    validUntil: "",
    location: "PARIS",
  });

  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const setLine = (i: number, k: keyof QuoteLine, v: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  // Totals
  const totalTTC = lines.reduce((s, l) => s + (parseFloat(l.amountTTC) || 0), 0);
  const totalHT = totalTTC / 1.2;
  const tva = totalTTC - totalHT;

  const handleSubmit = async (sendNow: boolean) => {
    if (!form.clientFirstName || !form.clientLastName || !form.clientEmail || !form.clientPhone || !form.macModel) {
      toast.error("Veuillez remplir les informations obligatoires");
      return;
    }
    const validLines = lines.filter((l) => l.description.trim() || l.amountTTC);
    if (validLines.length === 0) {
      toast.error("Ajoutez au moins une ligne de devis");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lines: validLines.map((l) => ({
            description: l.description,
            faultType: l.faultType,
            amountTTC: parseFloat(l.amountTTC) || 0,
          })),
          sendNow,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      const quote = await res.json();
      toast.success(sendNow ? "Devis créé et envoyé par email ✓" : "Devis enregistré ✓");
      router.push(`/admin/quotes/${quote.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-[#86868b] hover:text-[#1d1d1f] mb-3 flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </button>
        <h1 className="text-xl font-semibold text-[#1d1d1f]">Nouveau devis</h1>
        <p className="text-sm text-[#86868b] mt-1">Créez un devis à envoyer directement au client</p>
      </div>

      {/* Client */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4">Informations client</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Prénom <span className="text-red-500">*</span></label>
            <Input value={form.clientFirstName} onChange={(e) => setField("clientFirstName", e.target.value)} placeholder="Jean" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Nom <span className="text-red-500">*</span></label>
            <Input value={form.clientLastName} onChange={(e) => setField("clientLastName", e.target.value)} placeholder="Dupont" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Email <span className="text-red-500">*</span></label>
            <Input type="email" value={form.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} placeholder="jean@exemple.fr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Téléphone <span className="text-red-500">*</span></label>
            <Input value={form.clientPhone} onChange={(e) => setField("clientPhone", e.target.value)} placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Société</label>
            <Input value={form.clientCompany} onChange={(e) => setField("clientCompany", e.target.value)} placeholder="Facultatif" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Adresse</label>
            <Input value={form.clientAddress} onChange={(e) => setField("clientAddress", e.target.value)} placeholder="123 rue de la Paix" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Code postal</label>
            <Input value={form.clientPostalCode} onChange={(e) => setField("clientPostalCode", e.target.value)} placeholder="75001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Ville</label>
            <Input value={form.clientCity} onChange={(e) => setField("clientCity", e.target.value)} placeholder="Paris" />
          </div>
        </div>
      </Card>

      {/* Mac */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4">Appareil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Modèle Mac <span className="text-red-500">*</span></label>
            <Select options={macModelOptions} value={form.macModel} onChange={(e) => setField("macModel", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Numéro de série</label>
            <Input value={form.serialNumber} onChange={(e) => setField("serialNumber", e.target.value)} placeholder="Ex: C02X..." />
          </div>
        </div>
      </Card>

      {/* Lines */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#1d1d1f]">Lignes du devis</h2>
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs font-medium text-[#0071e3] hover:text-[#0077ed] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une ligne
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#86868b] mb-1">Description</label>
                  <Input
                    value={line.description}
                    onChange={(e) => setLine(i, "description", e.target.value)}
                    placeholder="Ex: Remplacement batterie..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#86868b] mb-1">Montant TTC (€)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amountTTC}
                    onChange={(e) => setLine(i, "amountTTC", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs text-[#86868b] mb-1">Type de panne</label>
                  <Select
                    options={faultTypeOptions}
                    value={line.faultType}
                    onChange={(e) => setLine(i, "faultType", e.target.value)}
                  />
                </div>
              </div>
              {lines.length > 1 && (
                <button
                  onClick={() => removeLine(i)}
                  className="mt-5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        {totalTTC > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-end">
              <div className="space-y-1 text-sm min-w-[200px]">
                <div className="flex justify-between text-[#86868b]">
                  <span>Total HT</span>
                  <span>{totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between text-[#86868b]">
                  <span>TVA (20%)</span>
                  <span>{tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                </div>
                <div className="flex justify-between font-semibold text-[#1d1d1f] text-base pt-1 border-t border-gray-200">
                  <span>Total TTC</span>
                  <span>{totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Details */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4">Informations complémentaires</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Valable jusqu&apos;au</label>
            <Input type="date" value={form.validUntil} onChange={(e) => setField("validUntil", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Atelier</label>
            <Select options={locationOptions} value={form.location} onChange={(e) => setField("location", e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-[#424245] mb-1.5">Notes internes</label>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent resize-none"
            rows={2}
            placeholder="Notes visibles uniquement en interne..."
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="secondary" size="md" onClick={() => handleSubmit(false)} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer en brouillon"}
        </Button>
        <Button variant="primary" size="md" onClick={() => handleSubmit(true)} disabled={saving}>
          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {saving ? "Envoi en cours..." : "Créer et envoyer par email"}
        </Button>
      </div>
    </div>
  );
}
