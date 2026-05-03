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
import { PART_CATEGORIES } from "@/lib/constants";

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

const categoryOptions = [
  { value: "", label: "Toutes les categories" },
  ...PART_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export default function StockPage() {
  const router = useRouter();
  const toast = useToast();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
            {parts.length} piece{parts.length !== 1 ? "s" : ""} en stock
          </p>
        </div>
        <Link href="/admin/stock/new">
          <Button variant="primary" size="sm">
            <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter une piece
          </Button>
        </Link>
      </div>

      {/* Filters */}
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
    </div>
  );
}
