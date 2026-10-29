"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { BuybackStatusBadge } from "@/components/ui/BuybackStatusBadge";
import { CARRIERS } from "@/lib/constants";
import { buybackTimeline, dropOffLabel, formatEuro, getBuybackStatuses, getBuybackStatusLabel, paymentDeadline } from "@/lib/buyback";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

interface Buyback {
  id: string;
  token: string;
  reference: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  clientCity: string;
  clientPostalCode: string;
  macFamily: string;
  macModel: string;
  configuration: string;
  configManual: boolean;
  condition: string;
  fault: string;
  battery: string;
  charger: string;
  serialNumber: string;
  offerAmount: number;
  counterOfferAmount: number | null;
  counterOfferReason: string;
  counterOfferStatus: string;
  finalAmount: number;
  dropOffMode: string;
  requestedDate: string | null;
  requestedSlot: string;
  appointmentDate: string | null;
  inboundTracking: string;
  carrier: string;
  trackingLink: string;
  labelUrl: string;
  ibanLast4: string;
  accountHolder: string;
  hasIban: boolean;
  status: string;
  receivedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  notes: { id: string; content: string; isInternal: boolean; createdAt: string; user: Person | null }[];
  statusChanges: { id: string; fromStatus: string; toStatus: string; createdAt: string; user: Person | null }[];
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** Valeur pour <input type="datetime-local"> en heure de Paris. */
function toLocalInput(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return parts.replace(" ", "T");
}

/** Convertit la saisie (heure de Paris) en ISO. */
function fromLocalInput(v: string) {
  if (!v) return null;
  const guess = new Date(`${v}:00Z`);
  const paris = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (paris.getTime() - utc.getTime())).toISOString();
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{children || "—"}</span>
    </div>
  );
}

export default function BuybackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [b, setB] = useState<Buyback | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [iban, setIban] = useState<string | null>(null);

  // formulaires
  const [shipping, setShipping] = useState({ inboundTracking: "", carrier: "", trackingLink: "", labelUrl: "" });
  const [appointment, setAppointment] = useState("");
  const [counter, setCounter] = useState({ amount: "", reason: "" });
  const [note, setNote] = useState({ content: "", isInternal: true });

  const load = useCallback(async () => {
    const res = await fetch(`/api/reprises/${id}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data: Buyback = await res.json();
    setB(data);
    setShipping({ inboundTracking: data.inboundTracking, carrier: data.carrier, trackingLink: data.trackingLink, labelUrl: data.labelUrl });
    setAppointment(toLocalInput(data.appointmentDate));
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function call(key: string, url: string, method: string, body?: unknown, success?: string) {
    setSaving(key);
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return false;
      }
      if (success) toast.success(success);
      await load();
      return true;
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <PageLoader />;
  if (!b) {
    return (
      <Card>
        <p className="text-gray-600">Reprise introuvable.</p>
        <Link href="/admin/reprises" className="text-[#0071e3] hover:underline">
          Retour aux reprises
        </Link>
      </Card>
    );
  }

  const statuses = getBuybackStatuses(b.dropOffMode);
  const timeline = buybackTimeline(b.dropOffMode);
  const nextStatus = timeline[timeline.indexOf(b.status) + 1];
  const deadline = paymentDeadline(b.receivedAt);
  const agreed = b.finalAmount > 0 ? b.finalAmount : b.counterOfferStatus === "ACCEPTED" && b.counterOfferAmount != null ? b.counterOfferAmount : b.offerAmount;
  const portalUrl = `/suivi-reprise/${b.token}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/reprises" className="text-sm text-gray-500 hover:text-gray-900">
          ← Reprises
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{b.reference}</h1>
          <BuybackStatusBadge status={b.status} mode={b.dropOffMode} />
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${b.dropOffMode === "LOCAL" ? "bg-orange-50 text-orange-700" : "bg-purple-50 text-purple-700"}`}>
            {dropOffLabel(b.dropOffMode)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Reçue le {fmtDateTime(b.createdAt)} ·{" "}
          <a href={portalUrl} target="_blank" className="text-[#0071e3] hover:underline">
            Voir le portail client
          </a>
        </p>
      </div>

      {deadline && !["PAID", "RETURNED", "CANCELLED", "OFFER_REFUSED"].includes(b.status) && (
        <div className={`rounded-xl border p-4 text-sm ${deadline.getTime() < Date.now() ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          Virement de <strong>{formatEuro(agreed)}</strong> à envoyer avant le <strong>{fmtDateTime(deadline)}</strong> (48 h après réception).
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mac déclaré</CardTitle>
            </CardHeader>
            <Row label="Modèle">{b.macModel}</Row>
            <Row label="Configuration">{b.configuration + (b.configManual ? " (saisie manuelle, à vérifier)" : "")}</Row>
            <Row label="État déclaré">{b.condition}</Row>
            {b.fault && <Row label="Panne">{b.fault}</Row>}
            {b.battery && <Row label="Batterie">{b.battery}</Row>}
            {b.charger && <Row label="Chargeur">{b.charger}</Row>}
            <Row label="N° de série">{b.serialNumber}</Row>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Offre et paiement</CardTitle>
            </CardHeader>
            <Row label="Offre initiale">{formatEuro(b.offerAmount)}</Row>
            {b.counterOfferAmount != null && (
              <Row label="Contre-offre">
                {formatEuro(b.counterOfferAmount)}{" "}
                <span className="text-gray-500">
                  ({b.counterOfferStatus === "ACCEPTED" ? "acceptée" : b.counterOfferStatus === "REFUSED" ? "refusée" : "en attente du client"})
                </span>
              </Row>
            )}
            {b.counterOfferReason && <Row label="Motif">{b.counterOfferReason}</Row>}
            <Row label="Montant à payer">
              <strong>{formatEuro(agreed)}</strong>
            </Row>
            <Row label="Titulaire">{b.accountHolder}</Row>
            <Row label="IBAN">
              {iban ? (
                <span className="font-mono">{iban}</span>
              ) : b.hasIban ? (
                <span>
                  •••• {b.ibanLast4}{" "}
                  <button
                    className="ml-2 text-[#0071e3] hover:underline"
                    onClick={async () => {
                      const res = await fetch(`/api/reprises/${b.id}/iban`);
                      const data = await res.json();
                      if (res.ok) setIban(data.iban);
                      else toast.error(data.error || "IBAN indisponible");
                    }}
                  >
                    Afficher
                  </button>
                </span>
              ) : (
                "—"
              )}
            </Row>
            {iban && (
              <div className="mt-2 text-right">
                <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(iban.replace(/\s/g, "")).then(() => toast.success("IBAN copié"))}>
                  Copier l&apos;IBAN
                </Button>
              </div>
            )}
            {b.paidAt && <Row label="Payé le">{fmtDateTime(b.paidAt)}</Row>}
          </Card>

          {b.dropOffMode === "POSTAL" ? (
            <Card>
              <CardHeader>
                <CardTitle>Envoi du Mac</CardTitle>
              </CardHeader>
              <p className="mb-4 text-sm text-gray-600">
                Créez le bordereau, renseignez-le ici puis passez la reprise en « Bordereau envoyé » : le client le reçoit par e-mail.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Lien du bordereau (PDF)" placeholder="https://…" value={shipping.labelUrl} onChange={(e) => setShipping({ ...shipping, labelUrl: e.target.value })} />
                <Input label="N° de suivi" value={shipping.inboundTracking} onChange={(e) => setShipping({ ...shipping, inboundTracking: e.target.value })} />
                <Select
                  label="Transporteur"
                  options={[{ value: "", label: "—" }, ...CARRIERS.map((c) => ({ value: c, label: c }))]}
                  value={shipping.carrier}
                  onChange={(e) => setShipping({ ...shipping, carrier: e.target.value })}
                />
                <Input label="Lien de suivi" placeholder="https://…" value={shipping.trackingLink} onChange={(e) => setShipping({ ...shipping, trackingLink: e.target.value })} />
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Adresse d&apos;expédition du client : {b.clientAddress}, {b.clientPostalCode} {b.clientCity}
              </div>
              <div className="mt-4 flex justify-end">
                <Button loading={saving === "shipping"} onClick={() => call("shipping", `/api/reprises/${b.id}`, "PUT", shipping, "Envoi enregistré")}>
                  Enregistrer
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Rendez-vous de dépôt</CardTitle>
              </CardHeader>
              <Row label="Souhaité par le client">
                {b.requestedDate ? `${fmtDate(b.requestedDate)}${b.requestedSlot ? `, ${b.requestedSlot.toLowerCase()}` : ""}` : "—"}
              </Row>
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <Input label="Rendez-vous confirmé" type="datetime-local" value={appointment} onChange={(e) => setAppointment(e.target.value)} />
                <Button
                  loading={saving === "appointment"}
                  onClick={() => call("appointment", `/api/reprises/${b.id}`, "PUT", { appointmentDate: fromLocalInput(appointment) }, "Rendez-vous enregistré")}
                >
                  Enregistrer
                </Button>
              </div>
              <p className="mt-3 text-sm text-gray-500">Après l&apos;appel, enregistrez l&apos;heure puis passez la reprise en « Rendez-vous confirmé » : le client reçoit la confirmation.</p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <Textarea
              placeholder="Ajouter une note…"
              rows={3}
              value={note.content}
              onChange={(e) => setNote({ ...note, content: e.target.value })}
            />
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={!note.isInternal} onChange={(e) => setNote({ ...note, isInternal: !e.target.checked })} />
                Visible par le client sur son portail
              </label>
              <Button
                size="sm"
                loading={saving === "note"}
                disabled={!note.content.trim()}
                onClick={async () => {
                  if (await call("note", `/api/reprises/${b.id}/notes`, "POST", note, "Note ajoutée")) setNote({ content: "", isInternal: true });
                }}
              >
                Ajouter
              </Button>
            </div>
            <ul className="mt-4 space-y-3">
              {b.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-gray-900">{n.content}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {n.user ? `${n.user.firstName} ${n.user.lastName}` : "Client / système"} · {fmtDateTime(n.createdAt)}
                    {!n.isInternal && " · visible par le client"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statut</CardTitle>
            </CardHeader>
            {nextStatus && (
              <Button
                className="mb-4 w-full"
                loading={saving === "next"}
                onClick={() => call("next", `/api/reprises/${b.id}/status`, "PUT", { status: nextStatus }, "Statut mis à jour, client prévenu")}
              >
                Passer à « {getBuybackStatusLabel(nextStatus, b.dropOffMode)} »
              </Button>
            )}
            <div className="space-y-1.5">
              {statuses.map((s) => (
                <button
                  key={s.key}
                  disabled={s.key === b.status || saving !== null}
                  onClick={() => {
                    if (confirm(`Passer la reprise en « ${s.label} » ? Le client sera prévenu par e-mail et SMS.`)) {
                      call(s.key, `/api/reprises/${b.id}/status`, "PUT", { status: s.key }, "Statut mis à jour, client prévenu");
                    }
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    s.key === b.status ? "bg-[#1d1d1f] text-white" : "text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  }`}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </Card>

          {!["PAID", "RETURNED", "CANCELLED"].includes(b.status) && (
            <Card>
              <CardHeader>
                <CardTitle>Proposer une nouvelle offre</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <Input label="Montant (€)" type="number" min={0} value={counter.amount} onChange={(e) => setCounter({ ...counter, amount: e.target.value })} />
                <Textarea label="Motif (visible par le client)" rows={3} value={counter.reason} onChange={(e) => setCounter({ ...counter, reason: e.target.value })} />
                <Button
                  className="w-full"
                  variant="secondary"
                  loading={saving === "counter"}
                  disabled={counter.amount === ""}
                  onClick={async () => {
                    const ok = await call(
                      "counter",
                      `/api/reprises/${b.id}/counter-offer`,
                      "POST",
                      { amount: Number(counter.amount), reason: counter.reason },
                      "Nouvelle offre envoyée au client",
                    );
                    if (ok) setCounter({ amount: "", reason: "" });
                  }}
                >
                  Envoyer la nouvelle offre
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <Row label="Nom">
              {b.clientFirstName} {b.clientLastName}
            </Row>
            <Row label="E-mail">
              <a href={`mailto:${b.clientEmail}`} className="text-[#0071e3] hover:underline">
                {b.clientEmail}
              </a>
            </Row>
            <Row label="Téléphone">
              <a href={`tel:${b.clientPhone.replace(/\s/g, "")}`} className="text-[#0071e3] hover:underline">
                {b.clientPhone}
              </a>
            </Row>
            {b.clientAddress && (
              <Row label="Adresse">
                {b.clientAddress}, {b.clientPostalCode} {b.clientCity}
              </Row>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <ul className="space-y-2 text-sm">
              {b.statusChanges.map((c) => (
                <li key={c.id}>
                  <span className="text-gray-900">{getBuybackStatusLabel(c.toStatus, b.dropOffMode)}</span>
                  <span className="block text-xs text-gray-500">
                    {fmtDateTime(c.createdAt)} · {c.user ? `${c.user.firstName} ${c.user.lastName}` : "client"}
                  </span>
                </li>
              ))}
              <li>
                <span className="text-gray-900">Demande reçue</span>
                <span className="block text-xs text-gray-500">{fmtDateTime(b.createdAt)} · site de reprise</span>
              </li>
            </ul>
          </Card>

          <button
            className="text-sm text-red-600 hover:underline"
            onClick={async () => {
              if (!confirm(`Supprimer définitivement la reprise ${b.reference} ?`)) return;
              const res = await fetch(`/api/reprises/${b.id}`, { method: "DELETE" });
              if (res.ok) router.push("/admin/reprises");
              else toast.error((await res.json()).error || "Suppression impossible");
            }}
          >
            Supprimer la reprise
          </button>
        </div>
      </div>
    </div>
  );
}
