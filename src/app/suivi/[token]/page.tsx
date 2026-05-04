"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStatuses } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface StatusChange {
  id: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  type: string;
  createdAt: string;
}

interface Repair {
  id: string;
  token: string;
  clientFirstName: string;
  clientLastName: string;
  macModel: string;
  serialNumber: string;
  faultType: string;
  faultDescription: string;
  repairType: string;
  status: string;
  priority: string;
  inboundTracking: string;
  outboundTracking: string;
  carrier: string;
  trackingLink: string;
  paymentLink: string;
  estimatedCost: number;
  estimatedReturn: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  quoteValidated: boolean;
  quoteValidatedAt: string | null;
  appointmentDate: string | null;
  notes: Note[];
  statusChanges: StatusChange[];
  attachments: Attachment[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const num = encodeURIComponent(trackingNumber);
  switch (carrier) {
    case "Colissimo":
      return `https://www.laposte.fr/outils/suivre-vos-envois?code=${num}`;
    case "Chronopost":
      return `https://www.chronopost.fr/tracking-no-powerful/tracking/suivi?listeNumerosLT=${num}`;
    case "DHL":
      return `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${num}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${num}&loc=fr_FR`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${num}`;
    case "Mondial Relay":
      return `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${num}`;
    case "Relais Colis":
      return `https://www.relaiscolis.com/suivi-de-colis/?reference=${num}`;
    default:
      return "#";
  }
}

// ─── Component ────────────────────────────────────────────────────

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;

  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    async function fetchRepair() {
      try {
        const res = await fetch(`/api/tracking/${token}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setRepair(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchRepair();
  }, [token]);

  const handleValidateQuote = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/tracking/${token}/validate-quote`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de la validation");
        return;
      }
      const data = await res.json();
      setRepair((prev) =>
        prev
          ? {
              ...prev,
              quoteValidated: data.quoteValidated,
              quoteValidatedAt: data.quoteValidatedAt,
            }
          : prev
      );
      setShowQuoteModal(false);
    } catch {
      alert("Erreur de connexion");
    } finally {
      setValidating(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#f5f5f7] border-t-[#0071e3] animate-spin" />
        </div>
        <p className="mt-6 text-[#86868b] text-sm animate-pulse">
          Chargement de votre suivi...
        </p>
      </div>
    );
  }

  // ── 404 state ───────────────────────────────────────────────────

  if (notFound || !repair) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-6">
          <svg
            className="h-10 w-10 text-[#86868b]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[#1d1d1f] mb-2">
          Reparation introuvable
        </h2>
        <p className="text-[#86868b] max-w-md">
          Le lien de suivi que vous avez utilise ne correspond a aucune
          reparation. Verifiez le lien ou contactez-nous pour obtenir de l&apos;aide.
        </p>
        <a
          href="mailto:lucas.macbroker@gmail.com"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white text-sm font-medium rounded-full hover:bg-[#0077ed] transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Nous contacter
        </a>
      </div>
    );
  }

  // ── Build timeline data ─────────────────────────────────────────

  const statuses = getStatuses(repair.repairType);
  const currentStatusIndex = statuses.findIndex(
    (s) => s.key === repair.status
  );

  // Map status changes to a lookup: status key -> timestamp when reached
  const statusTimestamps: Record<string, string> = {};
  // statusChanges are ordered desc, process in chronological order
  const sortedChanges = [...repair.statusChanges].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  for (const sc of sortedChanges) {
    statusTimestamps[sc.toStatus] = sc.createdAt;
  }
  // The initial status (PENDING) timestamp is the repair creation date
  if (!statusTimestamps["PENDING"]) {
    statusTimestamps["PENDING"] = repair.createdAt;
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="animate-fadeIn">
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInStep {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 113, 227, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 113, 227, 0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .timeline-step {
          animation: fadeInStep 0.4s ease-out both;
        }
        .pulse-current {
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>

      {/* Hero section */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight mb-2">
          Suivi de reparation
        </h1>
        <p className="text-[#86868b]">
          Bonjour{" "}
          <span className="text-[#1d1d1f] font-medium">
            {repair.clientFirstName}
          </span>
          , voici l&apos;etat de votre reparation.
        </p>
      </div>

      {/* Info card */}
      <div className="bg-[#f5f5f7] rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#86868b] mb-1">
              Client
            </p>
            <p className="text-[#1d1d1f] font-medium">
              {repair.clientFirstName} {repair.clientLastName}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#86868b] mb-1">
              Modele
            </p>
            <p className="text-[#1d1d1f] font-medium">{repair.macModel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#86868b] mb-1">
              Type de panne
            </p>
            <p className="text-[#1d1d1f] font-medium">{repair.faultType}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#86868b] mb-1">
              {repair.repairType === "POSTAL"
                ? "Date d'envoi"
                : repair.repairType === "HOME"
                ? "Date de création"
                : "Date de depot"}
            </p>
            <p className="text-[#1d1d1f] font-medium">
              {formatDate(repair.createdAt)}
            </p>
          </div>
          {repair.estimatedReturn && (
            <div>
              <p className="text-xs uppercase tracking-wider text-[#86868b] mb-1">
                Retour estime
              </p>
              <p className="text-[#1d1d1f] font-medium">
                {formatDate(repair.estimatedReturn)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wider text-[#86868b] mb-1">
              Type de reparation
            </p>
            <p className="text-[#1d1d1f] font-medium">
              {repair.repairType === "POSTAL"
                ? "Envoi postal"
                : repair.repairType === "HOME"
                ? "À domicile"
                : "Atelier local"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <div className="mb-10">
        <h2 className="text-xl font-semibold text-[#1d1d1f] mb-6">
          Avancement
        </h2>

        <div className="relative">
          {statuses.map((step, idx) => {
            const isCompleted = idx < currentStatusIndex;
            const isCurrent = idx === currentStatusIndex;
            const isFuture = idx > currentStatusIndex;
            const isLast = idx === statuses.length - 1;
            const timestamp = statusTimestamps[step.key];

            return (
              <div
                key={step.key}
                className="timeline-step relative flex gap-4 pb-8"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-[44px] w-0.5 bottom-0 transition-colors duration-500 ${
                      isCompleted ? "bg-green-400" : isCurrent ? "bg-gradient-to-b from-[#0071e3] to-[#d2d2d7]" : "bg-[#e5e5e5]"
                    }`}
                  />
                )}

                {/* Circle icon */}
                <div className="relative flex-shrink-0 z-10">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm shadow-green-200 transition-all duration-500">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : isCurrent ? (
                    <div className="w-10 h-10 rounded-full bg-[#0071e3] flex items-center justify-center shadow-sm shadow-blue-200 pulse-current">
                      <span className="text-lg">{step.icon}</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border-2 border-[#e5e5e5] flex items-center justify-center">
                      <span className="text-lg grayscale opacity-40">
                        {step.icon}
                      </span>
                    </div>
                  )}
                </div>

                {/* Label & timestamp */}
                <div className="pt-1.5 min-w-0">
                  <p className={`text-sm leading-snug transition-colors duration-300 ${
                    isCompleted ? "text-green-700 font-medium"
                    : isCurrent ? "text-[#1d1d1f] font-semibold text-base"
                    : "text-[#86868b]"
                  }`}>
                    {step.label}
                  </p>
                  {isCurrent && step.key === "UPCOMING" && repair.appointmentDate && (
                    <p className="text-sm font-semibold text-[#0071e3] mt-1">
                      {new Date(repair.appointmentDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {new Date(repair.appointmentDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {(isCompleted || isCurrent) && timestamp && (
                    <p className="text-xs text-[#86868b] mt-0.5">{formatDateTime(timestamp)}</p>
                  )}
                  {isCurrent && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-[#0071e3] text-xs font-medium rounded-full">
                      Statut actuel
                    </span>
                  )}
                  {isFuture && (
                    <p className="text-xs text-[#c7c7cc] mt-0.5">En attente</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Shipping tracking ─────────────────────────────────────── */}
      {repair.repairType === "POSTAL" &&
        repair.outboundTracking && (
          <div className="mb-8 p-5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">📦</span>
              </div>
              <div>
                <h3 className="font-semibold text-[#1d1d1f] mb-1">
                  Votre Mac a ete expedie !
                </h3>
                <p className="text-sm text-[#86868b] mb-3">
                  Transporteur :{" "}
                  <span className="font-medium text-[#424245]">
                    {repair.carrier || "Non precise"}
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  <code className="px-3 py-1.5 bg-white rounded-lg text-sm font-mono text-[#1d1d1f] border border-purple-100">
                    {repair.outboundTracking}
                  </code>
                  {repair.carrier && repair.carrier !== "Autre" && (
                    <a
                      href={getTrackingUrl(
                        repair.carrier,
                        repair.outboundTracking
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0071e3] text-white text-sm font-medium rounded-full hover:bg-[#0077ed] transition-colors"
                    >
                      Suivre le colis
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ── Tracking link (Chronopost) ─────────────────────────── */}
      {repair.trackingLink && (
        <div className="mb-8 p-5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">📦</span>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] mb-1">
                Suivi de votre colis
              </h3>
              <p className="text-sm text-[#86868b] mb-3">
                Suivez votre colis en temps reel en cliquant sur le lien ci-dessous.
              </p>
              <a
                href={repair.trackingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0071e3] text-white text-sm font-medium rounded-full hover:bg-[#0077ed] transition-colors"
              >
                Suivre mon colis
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment link ─────────────────────────────────────────── */}
      {repair.paymentLink && (
        <div className="mb-8 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💳</span>
            </div>
            <div>
              <h3 className="font-semibold text-[#1d1d1f] mb-1">
                Paiement en ligne
              </h3>
              <p className="text-sm text-[#86868b] mb-3">
                Cliquez sur le bouton ci-dessous pour proceder au paiement de votre reparation.
              </p>
              <a
                href={repair.paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition-colors"
              >
                Payer maintenant
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Documents & Devis ────────────────────────────────────── */}
      {repair.attachments && repair.attachments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#1d1d1f] mb-4">
            Documents
          </h2>

          {/* Quote validated banner */}
          {repair.quoteValidated && repair.quoteValidatedAt && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Devis valide</p>
                <p className="text-xs text-green-600">
                  Valide le {formatDate(repair.quoteValidatedAt)}
                </p>
              </div>
            </div>
          )}

          {/* Quote validation button */}
          {!repair.quoteValidated &&
            repair.attachments.some((a) => a.type === "Devis") && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 mb-1">
                      Un devis est disponible
                    </p>
                    <p className="text-xs text-amber-600 mb-3">
                      Consultez le devis ci-dessous puis validez-le pour lancer la reparation.
                    </p>
                    <button
                      onClick={() => setShowQuoteModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-full hover:bg-[#0077ed] transition-colors"
                    >
                      Valider le devis
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* File list */}
          <div className="space-y-2">
            {repair.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-[#f5f5f7] rounded-xl border border-[#e5e5e5]/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-[#e5e5e5] flex items-center justify-center flex-shrink-0">
                    {att.mimeType === "application/pdf" ? (
                      <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1d1d1f] truncate">
                      {att.fileName}
                    </p>
                    <p className="text-xs text-[#86868b]">
                      {att.type} · {formatFileSize(att.size)}
                    </p>
                  </div>
                </div>
                <a
                  href={`/api/repairs/${repair.id}/attachments/${att.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 ml-3 inline-flex items-center gap-1 px-3 py-1.5 text-[#0071e3] hover:bg-blue-50 text-xs font-medium rounded-lg transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Telecharger
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quote validation modal ─────────────────────────────────── */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowQuoteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">
              Confirmer la validation du devis
            </h3>
            <p className="text-sm text-[#86868b] mb-6">
              En validant le devis, vous acceptez le montant propose et autorisez
              le lancement de la reparation. Cette action est irreversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowQuoteModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-xl hover:bg-[#e8e8ed] transition-colors"
                disabled={validating}
              >
                Annuler
              </button>
              <button
                onClick={handleValidateQuote}
                disabled={validating}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#0071e3] rounded-xl hover:bg-[#0077ed] transition-colors disabled:opacity-50"
              >
                {validating ? "Validation..." : "Valider le devis"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Technician notes ─────────────────────────────────────── */}
      {repair.notes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#1d1d1f] mb-4">
            Notes du technicien
          </h2>
          <div className="space-y-3">
            {repair.notes.map((note) => (
              <div
                key={note.id}
                className="p-4 bg-[#f5f5f7] rounded-xl border border-[#e5e5e5]/60"
              >
                <p className="text-[#1d1d1f] text-sm leading-relaxed">
                  {note.content}
                </p>
                <p className="text-xs text-[#86868b] mt-2">
                  {formatDateTime(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reassurance ──────────────────────────────────────────── */}
      <div className="text-center py-6 border-t border-[#e5e5e5]/60">
        <p className="text-sm text-[#86868b]">
          Une question ? Contactez-nous a{" "}
          <a
            href="mailto:lucas.macbroker@gmail.com"
            className="text-[#0071e3] hover:underline"
          >
            lucas.macbroker@gmail.com
          </a>{" "}
          ou par telephone au{" "}
          <a
            href="tel:+33782712123"
            className="text-[#0071e3] hover:underline"
          >
            07 82 71 21 23
          </a>
          .
        </p>
      </div>
    </div>
  );
}
