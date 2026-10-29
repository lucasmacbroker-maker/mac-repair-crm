// ─── Statuts des reprises ──────────────────────────────────────────
// POSTAL : le client envoie son Mac avec un bordereau créé par MacPlace.
// LOCAL  : le client dépose son Mac à l'atelier sur rendez-vous.

export const BUYBACK_STATUSES_POSTAL = [
  { key: "PENDING",       label: "Demande reçue",                          icon: "📝" },
  { key: "LABEL_SENT",    label: "Bordereau envoyé",                       icon: "📮" },
  { key: "RECEIVED",      label: "Mac reçu à l'atelier",                   icon: "🏪" },
  { key: "CHECKING",      label: "Contrôle en cours",                      icon: "🔍" },
  { key: "COUNTER_OFFER", label: "Nouvelle offre proposée",                icon: "💬" },
  { key: "VALIDATED",     label: "Offre validée, virement en préparation", icon: "👍" },
  { key: "PAID",          label: "Virement envoyé",                        icon: "✅" },
  { key: "OFFER_REFUSED", label: "Offre refusée, retour du Mac",           icon: "↩️" },
  { key: "RETURNED",      label: "Mac renvoyé au client",                  icon: "📦" },
  { key: "CANCELLED",     label: "Reprise annulée",                        icon: "❌" },
] as const;

export const BUYBACK_STATUSES_LOCAL = [
  { key: "PENDING",       label: "Demande reçue",                          icon: "📝" },
  { key: "APPOINTMENT",   label: "Rendez-vous confirmé",                   icon: "🗓️" },
  { key: "RECEIVED",      label: "Mac déposé à l'atelier",                 icon: "🏪" },
  { key: "CHECKING",      label: "Contrôle en cours",                      icon: "🔍" },
  { key: "COUNTER_OFFER", label: "Nouvelle offre proposée",                icon: "💬" },
  { key: "VALIDATED",     label: "Offre validée, virement en préparation", icon: "👍" },
  { key: "PAID",          label: "Virement envoyé",                        icon: "✅" },
  { key: "OFFER_REFUSED", label: "Offre refusée, Mac à récupérer",         icon: "↩️" },
  { key: "RETURNED",      label: "Mac rendu au client",                    icon: "📦" },
  { key: "CANCELLED",     label: "Reprise annulée",                        icon: "❌" },
] as const;

/** Parcours normal affiché au client, dans l'ordre. */
export function buybackTimeline(mode: string): string[] {
  return mode === "LOCAL"
    ? ["PENDING", "APPOINTMENT", "RECEIVED", "CHECKING", "VALIDATED", "PAID"]
    : ["PENDING", "LABEL_SENT", "RECEIVED", "CHECKING", "VALIDATED", "PAID"];
}

export const BUYBACK_CLOSED_STATUSES = ["PAID", "RETURNED", "CANCELLED"];

export function getBuybackStatuses(mode: string) {
  return mode === "LOCAL" ? BUYBACK_STATUSES_LOCAL : BUYBACK_STATUSES_POSTAL;
}

export function getBuybackStatusLabel(status: string, mode: string): string {
  return getBuybackStatuses(mode).find((s) => s.key === status)?.label || status;
}

export function getBuybackStatusIcon(status: string, mode: string): string {
  return getBuybackStatuses(mode).find((s) => s.key === status)?.icon || "📋";
}

export const BUYBACK_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  LABEL_SENT: "bg-purple-100 text-purple-800 border-purple-300",
  APPOINTMENT: "bg-purple-100 text-purple-800 border-purple-300",
  RECEIVED: "bg-blue-100 text-blue-800 border-blue-300",
  CHECKING: "bg-orange-100 text-orange-800 border-orange-300",
  COUNTER_OFFER: "bg-pink-100 text-pink-800 border-pink-300",
  VALIDATED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  PAID: "bg-green-100 text-green-800 border-green-300",
  OFFER_REFUSED: "bg-red-100 text-red-800 border-red-300",
  RETURNED: "bg-gray-100 text-gray-800 border-gray-300",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-300",
};

export const dropOffLabel = (mode: string) => (mode === "LOCAL" ? "Dépôt atelier" : "Envoi postal");

/** Échéance de paiement : 48 h après la réception du Mac. */
export function paymentDeadline(receivedAt: Date | string | null | undefined): Date | null {
  if (!receivedAt) return null;
  return new Date(new Date(receivedAt).getTime() + 48 * 3600 * 1000);
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
