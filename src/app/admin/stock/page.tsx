"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { PageLoader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { PART_CATEGORIES, MAC_MODELS } from "@/lib/constants";

interface Part {
  id: string;
  name: string;
  sku: string;
  category: string;
  compatibility: string;
  quantity: number;
  alertThreshold: number;
  purchasePrice: number;
  sellPrice: number;
}

interface MacBook {
  id: string;
  model: string;
  year: string;
  specs: string;
  condition: string;
  originalPrice: number;
  promoPrice: number;
  status: string;
  notes: string;
}

const categoryOptions = [
  { value: "", label: "Toutes les categories" },
  ...PART_CATEGORIES.map((c) => ({ value: c, label: c })),
];

const MAC_CONDITIONS = ["Neuf", "Très bon état", "Bon état", "État correct"];
const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Disponible" },
  { value: "RESERVED", label: "Réservé" },
  { value: "SOLD", label: "Vendu" },
];
const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED: "bg-yellow-100 text-yellow-700",
  SOLD: "bg-gray-100 text-gray-500",
};

function emptyMac(): Partial<MacBook> {
  return { model: "", year: "", specs: "", condition: "Très bon état", originalPrice: 0, promoPrice: 0, status: "AVAILABLE", notes: "" };
}

export default function StockPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"parts" | "macbooks">("parts");

  // Parts
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // MacBooks
  const [macbooks, setMacbooks] = useState<MacBook[]>([]);
  const [macLoading, setMacLoading] = useState(false);
  const [showMacForm, setShowMacForm] = useState(false);
  const [editingMac, setEditingMac] = useState<MacBook | null>(null);
  const [macForm, setMacForm] = useState<Partial<MacBook>>(emptyMac());
  const [savingMac, setSavingMac] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Supprimer ce produit du stock ?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stock/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Produit supprimé");
        setParts((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const fetchMacbooks = useCallback(async () => {
    setMacLoading(true);
    try {
      const res = await fetch("/api/macbooks");
      if (res.ok) setMacbooks(await res.json());
    } catch { /* ignore */ } finally { setMacLoading(false); }
  }, []);

  useEffect(() => { if (tab === "macbooks") fetchMacbooks(); }, [tab, fetchMacbooks]);

  const handleSaveMac = async () => {
    if (!macForm.model) { toast.error("Modèle requis"); return; }
    setSavingMac(true);
    try {
      const url = editingMac ? `/api/macbooks/${editingMac.id}` : "/api/macbooks";
      const method = editingMac ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(macForm) });
      if (!res.ok) throw new Error("Erreur");
      toast.success(editingMac ? "MacBook mis à jour ✓" : "MacBook ajouté ✓");
      setShowMacForm(false);
      setEditingMac(null);
      setMacForm(emptyMac());
      fetchMacbooks();
    } catch { toast.error("Erreur lors de la sauvegarde"); } finally { setSavingMac(false); }
  };

  const handleDeleteMac = async (id: string) => {
    if (!confirm("Supprimer ce MacBook ?")) return;
    try {
      const res = await fetch(`/api/macbooks/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("MacBook supprimé"); fetchMacbooks(); }
      else toast.error("Erreur lors de la suppression");
    } catch { toast.error("Erreur"); }
  };

  const fetchParts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (lowStockOnly) params.set("lowStock", "true");

    try {
      const res = await fetch(`/api/stock?${params}`);
      const data = await res.json();
      setParts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erreur lors du chargement du stock");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, lowStockOnly]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const isLowStock = (part: Part) => part.quantity <= part.alertThreshold;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight">Stock</h1>
          <p className="text-sm text-[#86868b] mt-1">
            {tab === "parts" ? `${parts.length} pièce${parts.length !== 1 ? "s" : ""} en stock` : `${macbooks.filter(m => m.status === "AVAILABLE").length} MacBook${macbooks.filter(m => m.status === "AVAILABLE").length !== 1 ? "s" : ""} disponibles`}
          </p>
        </div>
        {tab === "parts" ? (
          <Link href="/admin/stock/new">
            <Button variant="primary" size="sm">
              <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter une piece
            </Button>
          </Link>
        ) : (
          <Button variant="primary" size="sm" onClick={() => { setEditingMac(null); setMacForm(emptyMac()); setShowMacForm(true); }}>
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un MacBook
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f5f5f7] rounded-xl p-1 w-fit">
        {(["parts", "macbooks"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white shadow-sm text-[#1d1d1f]" : "text-[#86868b] hover:text-[#1d1d1f]"}`}
          >
            {t === "parts" ? "Pièces détachées" : "MacBooks à vendre"}
          </button>
        ))}
      </div>

      {tab === "macbooks" ? (
        /* ─── MacBooks à vendre ─── */
        <div>
          {macLoading ? <PageLoader /> : macbooks.length === 0 ? (
            <Card>
              <EmptyState
                title="Aucun MacBook référencé"
                description="Ajoutez un MacBook à vendre pour démarrer."
                action={<Button variant="primary" size="sm" onClick={() => { setMacForm(emptyMac()); setShowMacForm(true); }}>Ajouter un MacBook</Button>}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {macbooks.map(m => {
                const saving = m.originalPrice > m.promoPrice ? Math.round((1 - m.promoPrice / m.originalPrice) * 100) : 0;
                return (
                  <Card key={m.id} className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-[#1d1d1f]">{m.model}{m.year ? ` ${m.year}` : ""}</p>
                        <p className="text-xs text-[#86868b] mt-0.5">{m.condition}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${STATUS_COLORS[m.status] || STATUS_COLORS.AVAILABLE}`}>
                        {STATUS_OPTIONS.find(s => s.value === m.status)?.label}
                      </span>
                    </div>
                    {m.specs && <p className="text-xs text-[#424245] mb-3 leading-relaxed">{m.specs}</p>}
                    <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                      <div>
                        {m.originalPrice > m.promoPrice && (
                          <p className="text-xs text-[#86868b] line-through">{m.originalPrice.toLocaleString("fr-FR")} €</p>
                        )}
                        <p className="text-xl font-bold text-[#0071e3]">{m.promoPrice.toLocaleString("fr-FR")} €</p>
                        {saving > 0 && <p className="text-xs text-green-600 font-medium">-{saving}%</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingMac(m); setMacForm({ ...m }); setShowMacForm(true); }}
                          className="text-xs text-[#0071e3] hover:underline"
                        >Modifier</button>
                        <button onClick={() => handleDeleteMac(m.id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add/Edit MacBook modal */}
          {showMacForm && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">{editingMac ? "Modifier le MacBook" : "Ajouter un MacBook"}</h2>
                  <button onClick={() => setShowMacForm(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#86868b] mb-1">Modèle *</label>
                    <select value={macForm.model || ""} onChange={e => setMacForm({ ...macForm, model: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                      <option value="">Sélectionner...</option>
                      {MAC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">Année</label>
                      <input type="text" value={macForm.year || ""} onChange={e => setMacForm({ ...macForm, year: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                        placeholder="2022" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">État</label>
                      <select value={macForm.condition || "Très bon état"} onChange={e => setMacForm({ ...macForm, condition: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                        {MAC_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868b] mb-1">Spécifications</label>
                    <textarea value={macForm.specs || ""} onChange={e => setMacForm({ ...macForm, specs: e.target.value })}
                      rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
                      placeholder="Ex: Apple M2, 8 Go RAM, 256 Go SSD, Puce GPU 8 cœurs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">Prix d'origine (€)</label>
                      <input type="number" min="0" step="1" value={macForm.originalPrice || ""} onChange={e => setMacForm({ ...macForm, originalPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                        placeholder="1299" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#86868b] mb-1">Prix promo (€) *</label>
                      <input type="number" min="0" step="1" value={macForm.promoPrice || ""} onChange={e => setMacForm({ ...macForm, promoPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                        placeholder="899" />
                    </div>
                  </div>
                  {(macForm.originalPrice || 0) > 0 && (macForm.promoPrice || 0) > 0 && (macForm.originalPrice || 0) > (macForm.promoPrice || 0) && (
                    <div className="bg-green-50 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
                      Réduction : -{Math.round((1 - (macForm.promoPrice || 0) / (macForm.originalPrice || 1)) * 100)}% — Économie de {((macForm.originalPrice || 0) - (macForm.promoPrice || 0)).toLocaleString("fr-FR")} €
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[#86868b] mb-1">Statut</label>
                    <select value={macForm.status || "AVAILABLE"} onChange={e => setMacForm({ ...macForm, status: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#86868b] mb-1">Notes internes</label>
                    <textarea value={macForm.notes || ""} onChange={e => setMacForm({ ...macForm, notes: e.target.value })}
                      rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
                      placeholder="Notes optionnelles..." />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="secondary" size="md" className="flex-1" onClick={() => setShowMacForm(false)}>Annuler</Button>
                    <Button variant="primary" size="md" className="flex-1" onClick={handleSaveMac} disabled={savingMac}>
                      {savingMac ? "Sauvegarde..." : editingMac ? "Enregistrer" : "Ajouter"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
      /* ─── Pièces détachées ─── */
      <>
      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Rechercher (nom, SKU...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-[#424245] px-1">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-gray-300 text-[#0071e3] focus:ring-[#0071e3]"
            />
            Afficher stock bas uniquement
          </label>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <PageLoader />
      ) : parts.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucune piece trouvee"
            description="Modifiez vos filtres ou ajoutez une nouvelle piece."
            action={
              <Link href="/admin/stock/new">
                <Button variant="primary" size="sm">Ajouter une piece</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div>
          <div className="lg:hidden space-y-3">
          {parts.map((part) => {
            const low = isLowStock(part);
            return (
              <Card key={part.id}>
                <Link href={`/admin/stock/${part.id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1d1d1f]">{part.name}</p>
                      <p className="text-xs text-[#86868b] font-mono">{part.sku}</p>
                    </div>
                    <span className={`text-lg font-bold ${low ? "text-red-700" : "text-[#1d1d1f]"}`}>
                      {part.quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="neutral">{part.category}</Badge>
                    {low && <Badge variant="danger">Stock bas</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#86868b]">
                    <span>Achat: {part.purchasePrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                    <span>Vente: {part.sellPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>

        {/* Desktop table */}
        <Card padding="none" className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Nom</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">SKU</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Categorie</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Compatibilite</th>
                  <th className="text-right text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Qte</th>
                  <th className="text-right text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Seuil</th>
                  <th className="text-right text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">P. achat</th>
                  <th className="text-right text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">P. vente</th>
                  <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parts.map((part) => {
                  const low = isLowStock(part);
                  return (
                    <tr
                      key={part.id}
                      className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${
                        low ? "bg-red-50/30" : ""
                      }`}
                      onClick={() => router.push(`/admin/stock/${part.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[#1d1d1f]">{part.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-[#86868b]">{part.sku}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{part.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#424245] max-w-[200px] truncate">
                        {part.compatibility || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${low ? "text-red-700" : "text-[#1d1d1f]"}`}>
                          {part.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[#86868b]">
                        {part.alertThreshold}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[#424245]">
                        {part.purchasePrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[#424245]">
                        {part.sellPrice.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/stock/${part.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#0071e3] hover:text-[#0077ed] text-sm font-medium"
                          >
                            Voir
                          </Link>
                          <button
                            onClick={(e) => handleDelete(e, part.id)}
                            disabled={deletingId === part.id}
                            className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
      )}
      </>
      )}
    </div>
  );
}
