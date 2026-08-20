export const STATUSES_LOCAL = [
  { key: "UPCOMING",  label: "Réparation à venir",    icon: "🗓️" },
  { key: "PENDING",   label: "Mac déposé en atelier", icon: "🏪" },
  { key: "RECEIVED",  label: "Diagnostic en cours",   icon: "🔍" },
  { key: "REPAIRING", label: "Réparation en cours",   icon: "🔧" },
  { key: "DONE",      label: "Réparation terminée",   icon: "✅" },
] as const;

export const STATUSES_HOME = [
  { key: "PENDING",   label: "Réparation à venir",  icon: "🗓️" },
  { key: "REPAIRING", label: "Réparation en cours", icon: "🔧" },
  { key: "DONE",      label: "Réparation terminée", icon: "✅" },
] as const;

export const STATUSES_POSTAL = [
  { key: "PENDING",   label: "Mac en cours d'envoi",              icon: "📦" },
  { key: "RECEIVED",  label: "Mac reçu en atelier",               icon: "🏪" },
  { key: "REPAIRING", label: "Réparation en cours",               icon: "🔧" },
  { key: "DONE",      label: "Mac réparé, en attente de paiement", icon: "✅" },
  { key: "CLOSED",    label: "Mac réexpédié",                     icon: "🚀" },
] as const;

// Keep for backward compat
export const REPAIR_STATUSES = STATUSES_LOCAL;

export function getStatuses(repairType?: string) {
  if (repairType === "HOME") return STATUSES_HOME;
  if (repairType === "POSTAL") return STATUSES_POSTAL;
  return STATUSES_LOCAL;
}

export function getStatusLabel(status: string, repairType: string): string {
  const statuses = getStatuses(repairType);
  return statuses.find((s) => s.key === status)?.label || status;
}

export function getStatusIcon(status: string, repairType: string): string {
  const statuses = getStatuses(repairType);
  return statuses.find((s) => s.key === status)?.icon || "📋";
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  RECEIVED: "bg-blue-100 text-blue-800 border-blue-300",
  REPAIRING: "bg-orange-100 text-orange-800 border-orange-300",
  DONE: "bg-green-100 text-green-800 border-green-300",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-300",
};

export const MAC_MODELS = [
  "MacBook Air",
  "MacBook Pro 13\"",
  "MacBook Pro 14\"",
  "MacBook Pro 16\"",
  "iMac",
  "Mac Mini",
  "Mac Pro",
  "Mac Studio",
] as const;

export const FAULT_TYPES = [
  "Écran / dalle LCD",
  "Batterie",
  "Clavier",
  "Carte mère",
  "Trackpad",
  "Port de charge",
  "SSD / stockage",
  "RAM",
  "Ventilateur / surchauffe",
  "Dégât des eaux",
  "Autre",
] as const;

export const PART_CATEGORIES = [
  "Écran",
  "Batterie",
  "Clavier",
  "Carte mère",
  "SSD",
  "RAM",
  "Trackpad",
  "Câble",
  "Visserie",
  "MacBook Air",
  "MacBook Pro",
  "Autre",
] as const;

export const PRIORITIES = [
  { key: "LOW", label: "Basse", color: "bg-gray-100 text-gray-700" },
  { key: "NORMAL", label: "Normale", color: "bg-blue-100 text-blue-700" },
  { key: "HIGH", label: "Haute", color: "bg-orange-100 text-orange-700" },
  { key: "URGENT", label: "Urgente", color: "bg-red-100 text-red-700" },
] as const;

export const CARRIERS = [
  "Colissimo",
  "Chronopost",
  "DHL",
  "UPS",
  "FedEx",
  "Mondial Relay",
  "Relais Colis",
  "Autre",
] as const;
