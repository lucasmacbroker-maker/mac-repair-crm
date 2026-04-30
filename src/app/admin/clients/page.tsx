"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Client {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  repairCount: number;
  lastRepair: string;
}

interface Part {
  id: string;
  name: string;
  category: string;
  quantity: number;
  sellPrice: number;
}

interface SelectedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
}

export default function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Promo form state
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [promoSubject, setPromoSubject] = useState("Nos dernières nouveautés Apple chez Mac Place");
  const [promoIntro, setPromoIntro] = useState(
    "Nous avons le plaisir de vous présenter nos dernières disponibilités en produits Apple. N'hésitez pas à nous contacter pour plus d'informations ou pour réserver un article.",
  );
  const [sending, setSending] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch {
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchParts = useCallback(async () => {
    try {
      const res = await fetch("/api/stock");
      const data = await res.json();
      setParts(Array.isArray(data) ? data.filter((p: Part) => p.quantity > 0) : []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchParts();
  }, [fetchClients, fetchParts]);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedClients.has(c.email));

  const toggleClient = (email: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filtered.map((c) => c.email)));
    }
  };

  const openPromoModal = () => {
    if (selectedClients.size === 0) {
      toast.error("Sélectionnez au moins un client");
      return;
    }
    setSelectedProducts([]);
    setShowPromoModal(true);
  };

  const toggleProduct = (part: Part) => {
    setSelectedProducts((prev) => {
      if (prev.find((p) => p.id === part.id)) {
        return prev.filter((p) => p.id !== part.id);
      }
      return [...prev, { id: part.id, name: part.name, description: "", price: part.sellPrice }];
    });
  };

  const updateProductDesc = (id: string, description: string) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, description } : p)),
    );
  };

  const updateProductPrice = (id: string, price: string) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, price: parseFloat(price) || 0 } : p)),
    );
  };

  const sendPromo = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Sélectionnez au moins un produit");
      return;
    }
    setSending(true);
    try {
      const recipients = clients
        .filter((c) => selectedClients.has(c.email))
        .map((c) => ({ email: c.email, firstName: c.firstName }));

      const res = await fetch("/api/emails/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject: promoSubject,
          introText: promoIntro,
          products: selectedProducts.map(({ name, description, price }) => ({ name, description, price })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Email envoyé à ${data.sent} client(s)`);
        setShowPromoModal(false);
        setSelectedClients(new Set());
      } else {
        toast.error("Erreur lors de l'envoi");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} client(s) au total</p>
        </div>
        {selectedClients.size > 0 && (
          <Button onClick={openPromoModal}>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Envoyer une promo ({selectedClients.size})
          </Button>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Rechercher par nom, email, téléphone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="Aucun client trouvé" description="Les clients apparaissent automatiquement lors de la création de réparations." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Réparations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => (
                  <tr key={client.email} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedClients.has(client.email)}
                        onChange={() => toggleClient(client.email)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{client.email}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{client.phone}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {client.repairCount} réparation{client.repairCount > 1 ? "s" : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Promo Modal */}
      {showPromoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Envoyer un email promotionnel</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedClients.size} destinataire(s)</p>
              </div>
              <button
                onClick={() => setShowPromoModal(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Objet du mail</label>
                <Input
                  value={promoSubject}
                  onChange={(e) => setPromoSubject(e.target.value)}
                  placeholder="Objet…"
                />
              </div>

              {/* Intro text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message d'introduction</label>
                <textarea
                  value={promoIntro}
                  onChange={(e) => setPromoIntro(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Message d'introduction…"
                />
              </div>

              {/* Product selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produits à mettre en avant{" "}
                  <span className="text-gray-400 font-normal">(depuis votre stock)</span>
                </label>
                {parts.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun produit en stock disponible.</p>
                ) : (
                  <div className="space-y-2">
                    {parts.map((part) => {
                      const selected = selectedProducts.find((p) => p.id === part.id);
                      return (
                        <div key={part.id} className={`border rounded-xl transition-colors ${selected ? "border-blue-300 bg-blue-50/50" : "border-gray-200"}`}>
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                            onClick={() => toggleProduct(part)}
                          >
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={() => toggleProduct(part)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{part.name}</p>
                              <p className="text-xs text-gray-400">{part.category} · {part.quantity} en stock</p>
                            </div>
                            <span className="text-blue-600 font-semibold text-sm whitespace-nowrap">
                              {part.sellPrice.toFixed(2)} €
                            </span>
                          </div>
                          {selected && (
                            <div className="px-4 pb-3 space-y-2 border-t border-blue-100" onClick={(e) => e.stopPropagation()}>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Description (optionnel)</label>
                                <input
                                  type="text"
                                  value={selected.description}
                                  onChange={(e) => updateProductDesc(part.id, e.target.value)}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ex: MacBook Pro 14 pouces, puce M3…"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Prix affiché (€)</label>
                                <input
                                  type="number"
                                  value={selected.price}
                                  onChange={(e) => updateProductPrice(part.id, e.target.value)}
                                  className="w-32 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowPromoModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <Button onClick={sendPromo} disabled={sending || selectedProducts.length === 0}>
                {sending ? "Envoi en cours…" : `Envoyer à ${selectedClients.size} client(s)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
