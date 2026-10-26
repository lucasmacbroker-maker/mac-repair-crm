"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { MAC_MODELS, FAULT_TYPES } from "@/lib/constants";

const macModelOptions = [
  { value: "", label: "Sélectionnez un modèle" },
  ...MAC_MODELS.map((m) => ({ value: m, label: m })),
];

const faultTypeOptions = [
  { value: "", label: "Sélectionnez un type de panne" },
  ...FAULT_TYPES.map((f) => ({ value: f, label: f })),
];

const locationOptions = [
  { value: "PARIS", label: "Maisons-Alfort" },
  { value: "NICE", label: "Nice" },
];

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
    faultType: "",
    faultDescription: "",
    estimatedCost: "",
    notes: "",
    validUntil: "",
    location: "PARIS",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (sendNow: boolean) => {
    if (!form.clientFirstName || !form.clientLastName || !form.clientEmail || !form.clientPhone || !form.macModel) {
      toast.error("Veuillez remplir les informations obligatoires");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sendNow }),
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

      {/* Client info */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4">Informations client</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Prénom <span className="text-red-500">*</span></label>
            <Input value={form.clientFirstName} onChange={(e) => set("clientFirstName", e.target.value)} placeholder="Jean" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Nom <span className="text-red-500">*</span></label>
            <Input value={form.clientLastName} onChange={(e) => set("clientLastName", e.target.value)} placeholder="Dupont" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Email <span className="text-red-500">*</span></label>
            <Input type="email" value={form.clientEmail} onChange={(e) => set("clientEmail", e.target.value)} placeholder="jean@exemple.fr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Téléphone <span className="text-red-500">*</span></label>
            <Input value={form.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="06 12 34 56 78" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Société</label>
            <Input value={form.clientCompany} onChange={(e) => set("clientCompany", e.target.value)} placeholder="Facultatif" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Adresse</label>
            <Input value={form.clientAddress} onChange={(e) => set("clientAddress", e.target.value)} placeholder="123 rue de la Paix" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Code postal</label>
            <Input value={form.clientPostalCode} onChange={(e) => set("clientPostalCode", e.target.value)} placeholder="75001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Ville</label>
            <Input value={form.clientCity} onChange={(e) => set("clientCity", e.target.value)} placeholder="Paris" />
          </div>
        </div>
      </Card>

      {/* Mac info */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4">Appareil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Modèle Mac <span className="text-red-500">*</span></label>
            <Select options={macModelOptions} value={form.macModel} onChange={(e) => set("macModel", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Numéro de série</label>
            <Input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} placeholder="Ex: C02X..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Type de panne</label>
            <Select options={faultTypeOptions} value={form.faultType} onChange={(e) => set("faultType", e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-[#424245] mb-1.5">Description de la panne</label>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent resize-none"
            rows={3}
            placeholder="Décrivez le problème..."
            value={form.faultDescription}
            onChange={(e) => set("faultDescription", e.target.value)}
          />
        </div>
      </Card>

      {/* Quote details */}
      <Card className="mb-5">
        <h2 className="text-sm font-semibold text-[#1d1d1f] mb-4">Détails du devis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Montant HT (€)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedCost}
              onChange={(e) => set("estimatedCost", e.target.value)}
              placeholder="150.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Valable jusqu&apos;au</label>
            <Input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#424245] mb-1.5">Atelier</label>
            <Select options={locationOptions} value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-[#424245] mb-1.5">Notes internes</label>
          <textarea
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent resize-none"
            rows={2}
            placeholder="Notes visibles uniquement en interne..."
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
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
