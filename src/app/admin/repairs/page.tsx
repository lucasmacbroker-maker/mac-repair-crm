"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Pagination } from "@/components/ui/Pagination";
import { PageLoader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { FAULT_TYPES, REPAIR_STATUSES } from "@/lib/constants";

interface Repair {
  id: string;
  token: string;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string;
  clientPhone: string;
  macModel: string;
  faultType: string;
  repairType: string;
  status: string;
  priority: string;
  quoteValidated: boolean;
  createdAt: string;
  appointmentDate?: string;
  serialNumber: string;
  technician?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

const allStatuses = REPAIR_STATUSES.map((s) => ({ value: s.key, label: s.label }));

const repairTypeLabel = (type: string) =>
  type === "POSTAL" ? "Postal" : type === "HOME" ? "À domicile" : "Atelier";

const repairTypeColor = (type: string) =>
  type === "POSTAL"
    ? "bg-purple-50 text-purple-700"
    : type === "HOME"
    ? "bg-green-50 text-green-700"
    : "bg-orange-50 text-orange-700";

const repairTypeOptions = [
  { value: "", label: "Tous les types" },
  { value: "POSTAL", label: "Postal" },
  { value: "LOCAL", label: "Atelier" },
  { value: "HOME", label: "À domicile" },
];

const faultTypeOptions = [
  { value: "", label: "Toutes les pannes" },
  ...FAULT_TYPES.map((f) => ({ value: f, label: f })),
];

export default function RepairsPage() {
  const router = useRouter();
  const toast = useToast();

  // "done" tab uses paginated list
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // "active" tab uses two-column split
  const [localRepairs, setLocalRepairs] = useState<Repair[]>([]);
  const [postalRepairs, setPostalRepairs] = useState<Repair[]>([]);

  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [repairTypeFilter, setRepairTypeFilter] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState("");
  const [faultTypeFilter, setFaultTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [tab, setTab] = useState<"active" | "done">("active");
  const [technicians, setTechnicians] = useState<User[]>([]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data) => {
        if (Array.isArray(data)) setTechnicians(data);
      })
      .catch(() => {});
  }, []);

  const fetchRepairs = useCallback(async () => {
    if (initialLoad) setLoading(true);

    const baseParams = new URLSearchParams();
    baseParams.set("statusGroup", tab);
    if (search) baseParams.set("search", search);
    if (statusFilter) baseParams.set("status", statusFilter);
    if (technicianFilter) baseParams.set("technicianId", technicianFilter);
    if (faultTypeFilter) baseParams.set("faultType", faultTypeFilter);
    if (dateFrom) baseParams.set("dateFrom", dateFrom);
    if (dateTo) baseParams.set("dateTo", dateTo);

    try {
      if (tab === "active") {
        // Fetch all active repairs in one call, split by type on frontend
        const params = new URLSearchParams(baseParams);
        params.set("limit", "200");
        if (repairTypeFilter) params.set("repairType", repairTypeFilter);

        const res = await fetch(`/api/repairs?${params}`);
        const data = await res.json();
        const all: Repair[] = data.repairs || [];

        const local = all.filter((r) => r.repairType === "LOCAL" || r.repairType === "HOME");
        const postal = all.filter((r) => r.repairType === "POSTAL");

        setLocalRepairs(local);
        setPostalRepairs(postal);
        setTotal(all.length);
      } else {
        // "done" tab: paginated list
        const params = new URLSearchParams(baseParams);
        params.set("page", String(page));
        params.set("limit", "20");
        if (repairTypeFilter) params.set("repairType", repairTypeFilter);

        const res = await fetch(`/api/repairs?${params}`);
        const data = await res.json();
        setRepairs(data.repairs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch {
      toast.error("Erreur lors du chargement des reparations");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, repairTypeFilter, technicianFilter, faultTypeFilter, dateFrom, dateTo, tab]);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (repairTypeFilter) params.set("repairType", repairTypeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reparations-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export CSV telecharge");
    } catch {
      toast.error("Erreur lors de l'export CSV");
    }
  };

  const handleExportFull = async () => {
    try {
      const res = await fetch("/api/export/full");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mac-place-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backup complet telecharge");
    } catch {
      toast.error("Erreur lors du backup");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/repairs/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      toast.success("Reparation supprimee");
      setDeleteId(null);
      fetchRepairs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  const handleTabChange = (newTab: "active" | "done") => {
    setTab(newTab);
    setPage(1);
    setStatusFilter("");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const statusOptions = [
    { value: "", label: "Tous les statuts" },
    ...allStatuses,
  ];

  const technicianOptions = [
    { value: "", label: "Tous les techniciens" },
    ...technicians.map((t) => ({
      value: t.id,
      label: `${t.firstName} ${t.lastName}`,
    })),
  ];

  // Compact repair row used in the two-column active layout
  const RepairRow = ({ repair }: { repair: Repair }) => (
    <div
      className="group px-4 py-3 hover:bg-gray-50/70 cursor-pointer transition-colors"
      onClick={() => router.push(`/admin/repairs/${repair.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#1d1d1f] truncate">
            {repair.clientFirstName} {repair.clientLastName}
          </p>
          <p className="text-xs text-[#86868b]">{repair.clientPhone}</p>
        </div>
        <StatusBadge status={repair.status} repairType={repair.repairType} />
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {repair.repairType !== "POSTAL" && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${repairTypeColor(repair.repairType)}`}>
              {repairTypeLabel(repair.repairType)}
            </span>
          )}
          <span className="text-xs text-[#424245] truncate">{repair.macModel}</span>
          <span className="text-xs text-[#86868b] flex-shrink-0">·</span>
          <span className="text-xs text-[#86868b] truncate">{repair.faultType}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#86868b]">
            {repair.appointmentDate ? (
              <span className="flex flex-col items-end gap-0">
                <span className="text-[10px] text-[#0071e3] font-medium leading-tight">RDV</span>
                <span className="leading-tight">{new Date(repair.appointmentDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</span>
                <span className="text-[10px] text-[#86868b] leading-tight">{new Date(repair.appointmentDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </span>
            ) : (
              new Date(repair.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
            )}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(repair.id); }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-0.5"
            title="Supprimer"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  // Determine which columns to show based on repairTypeFilter
  const showLocal = !repairTypeFilter || repairTypeFilter === "LOCAL" || repairTypeFilter === "HOME";
  const showPostal = !repairTypeFilter || repairTypeFilter === "POSTAL";
  const oneColumn = !showLocal || !showPostal;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight">
            Reparations
          </h1>
          <p className="text-sm text-[#86868b] mt-1">
            {total} réparation{total !== 1 ? "s" : ""} {tab === "active" ? "en cours" : "terminée" + (total !== 1 ? "s" : "")}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="secondary" size="sm" onClick={handleExportFull}>
            <svg className="h-4 w-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V9l-5-5H7C5 4 4 5 4 7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 4v4h4M8 12h8M8 16h8" />
            </svg>
            <span className="hidden sm:inline">Backup complet</span>
            <span className="sm:hidden">Backup</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <svg className="h-4 w-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Link href="/admin/repairs/new">
            <Button variant="primary" size="sm">
              <svg className="h-4 w-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nouvelle reparation</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#f5f5f7] p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange("active")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "active"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          En cours
        </button>
        <button
          onClick={() => handleTabChange("done")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "done"
              ? "bg-white text-[#1d1d1f] shadow-sm"
              : "text-[#86868b] hover:text-[#1d1d1f]"
          }`}
        >
          Terminées
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Input
              placeholder="Rechercher (nom, email, N/S...)"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            />
            <Select
              options={repairTypeOptions}
              value={repairTypeFilter}
              onChange={(e) => { setRepairTypeFilter(e.target.value); setPage(1); }}
            />
            <Select
              options={technicianOptions}
              value={technicianFilter}
              onChange={(e) => { setTechnicianFilter(e.target.value); setPage(1); }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              options={faultTypeOptions}
              value={faultTypeFilter}
              onChange={(e) => { setFaultTypeFilter(e.target.value); setPage(1); }}
            />
            <Input
              type="date"
              placeholder="Date debut"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            />
            <Input
              type="date"
              placeholder="Date fin"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            />
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setRepairTypeFilter("");
                setTechnicianFilter("");
                setFaultTypeFilter("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              Reinitialiser
            </Button>
          </div>
        </form>
      </Card>

      {/* Content */}
      {loading ? (
        <PageLoader />
      ) : tab === "active" ? (
        /* ── Active tab: two-column layout ── */
        (localRepairs.length === 0 && postalRepairs.length === 0) ? (
          <Card>
            <EmptyState
              title="Aucune réparation en cours"
              description="Modifiez vos filtres ou créez une nouvelle réparation."
              action={
                <Link href="/admin/repairs/new">
                  <Button variant="primary" size="sm">Nouvelle reparation</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className={`grid grid-cols-1 ${oneColumn ? "" : "lg:grid-cols-2"} gap-6`}>
            {/* Atelier & Domicile column */}
            {showLocal && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-[#1d1d1f]">Atelier & Domicile</span>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                    {localRepairs.length}
                  </span>
                </div>
                {localRepairs.length === 0 ? (
                  <Card>
                    <p className="text-sm text-[#86868b] text-center py-4">Aucune réparation</p>
                  </Card>
                ) : (
                  <Card padding="none" className="overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {localRepairs.map((repair) => (
                        <RepairRow key={repair.id} repair={repair} />
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Envoi Postal column */}
            {showPostal && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-[#1d1d1f]">Envoi Postal</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                    {postalRepairs.length}
                  </span>
                </div>
                {postalRepairs.length === 0 ? (
                  <Card>
                    <p className="text-sm text-[#86868b] text-center py-4">Aucune réparation</p>
                  </Card>
                ) : (
                  <Card padding="none" className="overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {postalRepairs.map((repair) => (
                        <RepairRow key={repair.id} repair={repair} />
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )
      ) : repairs.length === 0 ? (
        /* ── Done tab: empty state ── */
        <Card>
          <EmptyState
            title="Aucune réparation terminée"
            description="Les réparations terminées apparaîtront ici."
            action={
              <Link href="/admin/repairs/new">
                <Button variant="primary" size="sm">Nouvelle reparation</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        /* ── Done tab: paginated table ── */
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {repairs.map((repair) => (
              <Card key={repair.id}>
                <Link href={`/admin/repairs/${repair.id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1d1d1f]">
                        {repair.clientFirstName} {repair.clientLastName}
                      </p>
                      <p className="text-xs text-[#86868b]">{repair.clientPhone}</p>
                    </div>
                    <StatusBadge status={repair.status} repairType={repair.repairType} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs text-[#424245]">{repair.macModel}</span>
                    <span className="text-xs text-[#86868b]">&middot;</span>
                    <span className="text-xs text-[#424245]">{repair.faultType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${repairTypeColor(repair.repairType)}`}>
                        {repairTypeLabel(repair.repairType)}
                      </span>
                      {repair.quoteValidated && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Devis valide
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#86868b]">
                      {repair.appointmentDate ? (
                        <span className="flex flex-col">
                          <span className="text-[10px] text-[#0071e3] font-medium">Intervention</span>
                          {new Date(repair.appointmentDate).toLocaleDateString("fr-FR")}
                        </span>
                      ) : new Date(repair.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </Link>
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => setDeleteId(repair.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Supprimer
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card padding="none" className="hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">ID</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Client</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">N° Série</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Panne</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Statut</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {repairs.map((repair) => (
                    <tr
                      key={repair.id}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/admin/repairs/${repair.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-[#86868b]">
                          {repair.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#1d1d1f]">
                          {repair.clientFirstName} {repair.clientLastName}
                        </p>
                        <p className="text-xs text-[#86868b]">{repair.clientPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#424245] font-mono">
                        {repair.serialNumber || <span className="text-[#86868b]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#424245]">
                        {repair.faultType}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${repairTypeColor(repair.repairType)}`}>
                          {repairTypeLabel(repair.repairType)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={repair.status} repairType={repair.repairType} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#86868b]">
                        {repair.appointmentDate ? (
                          <span className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-[#0071e3] font-medium">Intervention</span>
                            <span>{new Date(repair.appointmentDate).toLocaleDateString("fr-FR")}</span>
                            <span className="text-xs text-[#424245] font-medium">
                              {new Date(repair.appointmentDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </span>
                        ) : new Date(repair.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/repairs/${repair.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#0071e3] hover:text-[#0077ed] text-sm font-medium"
                          >
                            Voir
                          </Link>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(repair.id); }}
                            className="text-red-400 hover:text-red-600 text-sm font-medium transition-colors"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      {/* Modal de confirmation suppression */}
      {deleteId && (
        <Modal isOpen={!!deleteId} title="Supprimer cette reparation ?" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-[#424245] mb-6">
            Cette action est irreversible. Toutes les donnees associees (notes, historique, pieces) seront supprimees.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="!bg-red-500 hover:!bg-red-600"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
