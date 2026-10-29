"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { buybackTimeline, formatEuro, getBuybackStatusIcon, getBuybackStatusLabel, paymentDeadline } from "@/lib/buyback";

interface BuybackView {
  reference: string;
  clientFirstName: string;
  macModel: string;
  configuration: string;
  configManual: boolean;
  condition: string;
  fault: string;
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
  status: string;
  receivedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  notes: { id: string; content: string; createdAt: string }[];
  statusChanges: { id: string; toStatus: string; createdAt: string }[];
}

const GREEN = "#2FD756";
const ATELIER = "39 rue du 11 novembre 1918, 94700 Maisons-Alfort";
const REFRESH_MS = 30_000;

const dateLong = (d: string | Date) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const dateTime = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const shortDateTime = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const isHttp = (u: string) => /^https?:\/\//i.test(u);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e5e5ea] p-6">
      <h2 className="mb-4 text-base font-semibold text-[#1d1d1f]">{title}</h2>
      {children}
    </section>
  );
}

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-[#86868b]">{label}</span>
      <span className="text-right text-[#1d1d1f]">{value}</span>
    </div>
  );
}

export default function BuybackTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [b, setB] = useState<BuybackView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [answering, setAnswering] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/suivi-reprise/${token}`, { cache: "no-store" });
      if (!res.ok) {
        setState((s) => (s === "ready" ? s : "notfound"));
        return;
      }
      setB(await res.json());
      setState("ready");
    } catch {
      setState((s) => (s === "ready" ? s : "notfound"));
    }
  }, [token]);

  useEffect(() => {
    load();
    // Suivi en temps réel : rafraîchissement régulier tant que la page est ouverte.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function answer(decision: "accept" | "refuse") {
    const msg =
      decision === "accept"
        ? "Accepter la nouvelle offre ? Le virement sera préparé avec ce montant."
        : "Refuser la nouvelle offre ? Votre Mac vous sera rendu gratuitement.";
    if (!confirm(msg)) return;
    setAnswering(true);
    try {
      const res = await fetch(`/api/suivi-reprise/${token}/counter-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) alert((await res.json().catch(() => ({}))).error || "Réponse non enregistrée, réessayez.");
      await load();
    } finally {
      setAnswering(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#f5f5f7]" style={{ borderTopColor: GREEN }} />
        <p className="mt-6 text-sm text-[#86868b]">Chargement de votre suivi…</p>
      </div>
    );
  }

  if (state === "notfound" || !b) {
    return (
      <div className="py-32 text-center">
        <h1 className="text-2xl font-semibold text-[#1d1d1f]">Reprise introuvable</h1>
        <p className="mt-2 text-[#86868b]">Vérifiez le lien reçu par e-mail, ou appelez-nous au 07 82 71 21 23.</p>
      </div>
    );
  }

  const mode = b.dropOffMode;
  const steps = buybackTimeline(mode);
  // Statuts hors parcours principal : on les rattache à l'étape la plus proche.
  const mapped = b.status === "COUNTER_OFFER" ? "CHECKING" : b.status;
  const currentIndex = steps.indexOf(mapped);
  const offTrack = ["OFFER_REFUSED", "RETURNED", "CANCELLED"].includes(b.status);
  const reachedAt = (key: string) => b.statusChanges.filter((c) => c.toStatus === key).at(-1)?.createdAt;
  const amount =
    b.finalAmount > 0
      ? b.finalAmount
      : b.counterOfferAmount != null && b.counterOfferStatus !== "REFUSED"
        ? b.counterOfferAmount
        : b.offerAmount;
  const deadline = paymentDeadline(b.receivedAt);
  const counterPending = b.status === "COUNTER_OFFER" && b.counterOfferStatus === "PENDING" && b.counterOfferAmount != null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#86868b]">Reprise {b.reference}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1d1d1f]">Bonjour {b.clientFirstName},</h1>
        <p className="mt-1 text-[#424245]">Voici où en est la reprise de votre {b.macModel}.</p>
      </div>

      <div className="rounded-2xl bg-[#f5f5f7] p-6 text-center">
        <div className="text-4xl">{getBuybackStatusIcon(b.status, mode)}</div>
        <p className="mt-2 text-xl font-semibold text-[#1d1d1f]">{getBuybackStatusLabel(b.status, mode)}</p>
        <p className="mt-1 text-xs text-[#86868b]">Mis à jour le {shortDateTime(b.updatedAt)}</p>
      </div>

      {counterPending && (
        <section className="rounded-2xl border-2 p-6" style={{ borderColor: GREEN }}>
          <h2 className="text-lg font-semibold text-[#1d1d1f]">Nouvelle offre après contrôle</h2>
          <p className="mt-1 text-sm text-[#424245]">Votre Mac ne correspond pas tout à fait à la description. Nous vous proposons :</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-[#1d1d1f]">{formatEuro(b.counterOfferAmount!)}</span>
            <span className="text-[#86868b] line-through">{formatEuro(b.offerAmount)}</span>
          </div>
          {b.counterOfferReason && <p className="mt-3 text-sm text-[#424245]">Motif : {b.counterOfferReason}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              disabled={answering}
              onClick={() => answer("accept")}
              className="rounded-full px-6 py-3 font-semibold text-[#1d1d1f] disabled:opacity-50"
              style={{ backgroundColor: GREEN }}
            >
              Accepter {formatEuro(b.counterOfferAmount!)}
            </button>
            <button
              disabled={answering}
              onClick={() => answer("refuse")}
              className="rounded-full border border-[#d2d2d7] px-6 py-3 font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50"
            >
              Refuser et récupérer mon Mac
            </button>
          </div>
        </section>
      )}

      {!offTrack && (
        <Section title="Étapes">
          <ol>
            {steps.map((key, i) => {
              const done = i < currentIndex || (i === currentIndex && key === "PAID");
              const current = i === currentIndex && key !== "PAID";
              const at = key === "PENDING" ? b.createdAt : reachedAt(key);
              return (
                <li key={key} className="grid grid-cols-[28px_1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                        done ? "text-[#1d1d1f]" : current ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#86868b]"
                      }`}
                      style={done ? { backgroundColor: GREEN } : undefined}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {i < steps.length - 1 && <span className="w-px flex-1 bg-[#e5e5ea]" />}
                  </div>
                  <div className="pb-5">
                    <p className={`font-medium ${done || current ? "text-[#1d1d1f]" : "text-[#86868b]"}`}>{getBuybackStatusLabel(key, mode)}</p>
                    {(done || current) && at && <p className="text-xs text-[#86868b]">{shortDateTime(at)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      <Section title="Votre offre">
        <Line label={b.status === "PAID" ? "Montant versé" : "Montant"} value={<strong className="text-lg">{formatEuro(amount)}</strong>} />
        {b.counterOfferStatus === "ACCEPTED" && <Line label="Offre initiale" value={<span className="line-through">{formatEuro(b.offerAmount)}</span>} />}
        {b.ibanLast4 && <Line label="Virement sur le compte" value={`•••• ${b.ibanLast4}`} />}
        {b.paidAt ? (
          <Line label="Virement envoyé le" value={dateTime(b.paidAt)} />
        ) : deadline && !offTrack ? (
          <Line label="Virement au plus tard le" value={dateTime(deadline)} />
        ) : (
          !offTrack && <p className="mt-2 text-sm text-[#86868b]">Le virement part au plus tard 48 h après la réception de votre Mac, une fois le contrôle effectué.</p>
        )}
      </Section>

      {mode === "POSTAL" ? (
        <Section title="Envoi de votre Mac">
          {isHttp(b.labelUrl) && ["PENDING", "LABEL_SENT"].includes(b.status) ? (
            <a
              href={b.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-block rounded-full px-6 py-3 font-semibold text-[#1d1d1f]"
              style={{ backgroundColor: GREEN }}
            >
              Télécharger mon bordereau
            </a>
          ) : (
            b.status === "PENDING" && <p className="mb-3 text-sm text-[#424245]">Votre bordereau prépayé arrive très prochainement par e-mail.</p>
          )}
          {b.inboundTracking && (
            <Line
              label={`Suivi${b.carrier ? ` ${b.carrier}` : ""}`}
              value={
                isHttp(b.trackingLink) ? (
                  <a href={b.trackingLink} target="_blank" rel="noopener noreferrer" className="text-[#1f67e7] hover:underline">
                    {b.inboundTracking}
                  </a>
                ) : (
                  b.inboundTracking
                )
              }
            />
          )}
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#424245]">
            <li>Sauvegardez puis effacez votre Mac, et déconnectez-le d&apos;iCloud (« Localiser » désactivé).</li>
            <li>Emballez-le dans un carton rigide, avec le chargeur si vous l&apos;avez déclaré.</li>
            <li>Collez le bordereau et déposez le colis en point relais.</li>
          </ul>
        </Section>
      ) : (
        <Section title="Dépôt à l'atelier">
          {b.appointmentDate ? (
            <Line label="Rendez-vous" value={<strong>{dateTime(b.appointmentDate)}</strong>} />
          ) : (
            <p className="mb-2 text-sm text-[#424245]">
              Vous souhaitez venir {b.requestedDate ? `le ${dateLong(b.requestedDate)}` : "prochainement"}
              {b.requestedSlot ? `, ${b.requestedSlot.toLowerCase()}` : ""}. Nous vous appelons pour confirmer l&apos;heure.
            </p>
          )}
          <Line label="Adresse" value={ATELIER} />
          <p className="mt-3 text-sm text-[#424245]">Venez avec votre Mac effacé et déconnecté d&apos;iCloud, et son chargeur.</p>
        </Section>
      )}

      <Section title="Votre Mac">
        <Line label="Modèle" value={b.macModel} />
        {b.configuration && <Line label="Configuration" value={b.configuration} />}
        <Line label="État déclaré" value={b.condition} />
        {b.fault && <Line label="Panne" value={b.fault} />}
        {b.serialNumber && <Line label="N° de série" value={b.serialNumber} />}
      </Section>

      {b.notes.length > 0 && (
        <Section title="Messages de l'atelier">
          <ul className="space-y-3">
            {b.notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-[#f5f5f7] p-4 text-sm">
                <p className="whitespace-pre-wrap text-[#1d1d1f]">{n.content}</p>
                <p className="mt-1 text-xs text-[#86868b]">{shortDateTime(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="text-center text-sm text-[#86868b]">
        Une question ? Appelez-nous au{" "}
        <a href="tel:+33782712123" className="text-[#1f67e7]">
          07 82 71 21 23
        </a>{" "}
        en indiquant la référence {b.reference}.
      </p>
    </div>
  );
}
