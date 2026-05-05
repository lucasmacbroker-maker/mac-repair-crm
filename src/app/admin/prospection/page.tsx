"use client";

import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────── Types ─────────────────────────── */
interface ProspectNote {
  id: string;
  content: string;
  type: string;
  createdAt: string;
}

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  linkedinUrl: string;
  source: string;
  status: string;
  priority: string;
  temperature: string;
  firstContactDate: string | null;
  lastInteraction: string | null;
  nextFollowUp: string | null;
  conversionDeadline: string | null;
  needsCallback: boolean;
  revenuePotential: number;
  notes: ProspectNote[];
  _count: { notes: number };
  createdAt: string;
}

/* ─────────────────────────── Constants ─────────────────────────── */
const STATUSES = [
  { key: "NOT_CONTACTED", label: "Non contacté", color: "bg-gray-100 text-gray-600", dot: "bg-gray-400", kanbanBg: "bg-gray-50" },
  { key: "CONTACTED",     label: "Contacté",     color: "bg-blue-100 text-blue-700",  dot: "bg-blue-500", kanbanBg: "bg-blue-50/50" },
  { key: "IN_DISCUSSION", label: "En discussion",color: "bg-purple-100 text-purple-700", dot: "bg-purple-500", kanbanBg: "bg-purple-50/50" },
  { key: "FOLLOWED_UP",   label: "Relancé",      color: "bg-orange-100 text-orange-700", dot: "bg-orange-500", kanbanBg: "bg-orange-50/50" },
  { key: "CONVERTED",     label: "Converti",     color: "bg-green-100 text-green-700", dot: "bg-green-500", kanbanBg: "bg-green-50/50" },
  { key: "LOST",          label: "Perdu",        color: "bg-red-100 text-red-700",    dot: "bg-red-400", kanbanBg: "bg-red-50/30" },
];

const PRIORITIES = [
  { key: "LOW",    label: "Faible", color: "text-gray-500" },
  { key: "MEDIUM", label: "Moyenne", color: "text-blue-600" },
  { key: "HIGH",   label: "Haute",  color: "text-red-600" },
];

const TEMPERATURES = [
  { key: "COLD", label: "Froid",  icon: "🧊", color: "text-blue-500" },
  { key: "WARM", label: "Tiède",  icon: "🌤️", color: "text-orange-500" },
  { key: "HOT",  label: "Chaud",  icon: "🔥", color: "text-red-500" },
];

const SOURCES = ["LinkedIn", "Recommandation", "Événement", "Site web", "Email", "Téléphone", "Autre"];

const NOTE_TYPES = [
  { key: "NOTE",     label: "Note",      icon: "📝" },
  { key: "CALL",     label: "Appel",     icon: "📞" },
  { key: "EMAIL",    label: "Email",     icon: "📧" },
  { key: "LINKEDIN", label: "LinkedIn",  icon: "💼" },
  { key: "MEETING",  label: "RDV",       icon: "🤝" },
];

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", phone: "", company: "",
  position: "", linkedinUrl: "", source: "LinkedIn",
  status: "NOT_CONTACTED", priority: "MEDIUM", temperature: "COLD",
  firstContactDate: "", lastInteraction: "", nextFollowUp: "",
  conversionDeadline: "", needsCallback: false, revenuePotential: "",
};

/* ─────────────────────────── Helpers ─────────────────────────── */
function getStatus(key: string) { return STATUSES.find(s => s.key === key) ?? STATUSES[0]; }
function getPriority(key: string) { return PRIORITIES.find(p => p.key === key) ?? PRIORITIES[1]; }
function getTemperature(key: string) { return TEMPERATURES.find(t => t.key === key) ?? TEMPERATURES[0]; }

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function fmtDate(dateStr: string | null, short = false) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", short
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "long", year: "numeric" }
  );
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* ═══════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════ */
export default function ProspectionPage() {
  const [prospects, setProspects]     = useState<Prospect[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<"kanban" | "table" | "followups">("kanban");
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus]           = useState("");
  const [filterPriority, setFilterPriority]       = useState("");
  const [filterTemperature, setFilterTemperature] = useState("");
  const [filterCallback, setFilterCallback]       = useState(false);
  const [filterToday, setFilterToday]             = useState(false);

  // Modals
  const [showForm, setShowForm]       = useState(false);
  const [formData, setFormData]       = useState({ ...EMPTY_FORM });
  const [saving, setSaving]           = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);

  // Detail panel
  const [detail, setDetail]           = useState<Prospect | null>(null);
  const [newNote, setNewNote]         = useState("");
  const [noteType, setNoteType]       = useState("NOTE");
  const [savingNote, setSavingNote]   = useState(false);

  /* ── Fetch ── */
  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus)      params.set("status", filterStatus);
      if (filterPriority)    params.set("priority", filterPriority);
      if (filterTemperature) params.set("temperature", filterTemperature);
      if (filterCallback)    params.set("needsCallback", "true");
      if (filterToday)       params.set("followUpToday", "true");
      if (search)            params.set("search", search);
      const res = await fetch(`/api/prospects?${params}`);
      if (res.ok) setProspects(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterStatus, filterPriority, filterTemperature, filterCallback, filterToday, search]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  /* ── Stats ── */
  const total       = prospects.length;
  const converted   = prospects.filter(p => p.status === "CONVERTED").length;
  const convRate    = total > 0 ? Math.round((converted / total) * 100) : 0;
  const todayFollowups = prospects.filter(p => isToday(p.nextFollowUp)).length;
  const overdueFollowups = prospects.filter(p => isOverdue(p.nextFollowUp) && !isToday(p.nextFollowUp) && p.status !== "CONVERTED" && p.status !== "LOST").length;
  const hotProspects = prospects.filter(p => p.temperature === "HOT").length;
  const totalRevenue = prospects.filter(p => p.status === "CONVERTED").reduce((s, p) => s + p.revenuePotential, 0);

  /* ── Form submit ── */
  async function handleSubmit() {
    if (!formData.firstName || !formData.lastName) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        revenuePotential: parseFloat(String(formData.revenuePotential)) || 0,
        firstContactDate: formData.firstContactDate || null,
        lastInteraction: formData.lastInteraction || null,
        nextFollowUp: formData.nextFollowUp || null,
        conversionDeadline: formData.conversionDeadline || null,
      };
      const url = editingId ? `/api/prospects/${editingId}` : "/api/prospects";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const saved: Prospect = await res.json();
      if (editingId) {
        setProspects(prev => prev.map(p => p.id === editingId ? saved : p));
        if (detail?.id === editingId) setDetail(saved);
      } else {
        setProspects(prev => [saved, ...prev]);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ ...EMPTY_FORM });
    } catch { alert("Erreur lors de l'enregistrement"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce prospect ?")) return;
    await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    setProspects(prev => prev.filter(p => p.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  async function handleStatusChange(prospect: Prospect, status: string) {
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProspects(prev => prev.map(p => p.id === prospect.id ? updated : p));
      if (detail?.id === prospect.id) setDetail(updated);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim() || !detail) return;
    setSavingNote(true);
    const res = await fetch(`/api/prospects/${detail.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, type: noteType }),
    });
    if (res.ok) {
      // Re-fetch prospect detail
      const res2 = await fetch(`/api/prospects/${detail.id}`);
      if (res2.ok) {
        const updated: Prospect = await res2.json();
        setDetail(updated);
        setProspects(prev => prev.map(p => p.id === detail.id ? updated : p));
      }
      setNewNote("");
    }
    setSavingNote(false);
  }

  async function handleDeleteNote(noteId: string) {
    if (!detail) return;
    await fetch(`/api/prospects/${detail.id}/notes?noteId=${noteId}`, { method: "DELETE" });
    const res = await fetch(`/api/prospects/${detail.id}`);
    if (res.ok) {
      const updated: Prospect = await res.json();
      setDetail(updated);
      setProspects(prev => prev.map(p => p.id === detail.id ? updated : p));
    }
  }

  function openEdit(p: Prospect) {
    setEditingId(p.id);
    setFormData({
      firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone,
      company: p.company, position: p.position, linkedinUrl: p.linkedinUrl, source: p.source,
      status: p.status, priority: p.priority, temperature: p.temperature,
      firstContactDate: p.firstContactDate ? p.firstContactDate.slice(0, 10) : "",
      lastInteraction: p.lastInteraction ? p.lastInteraction.slice(0, 10) : "",
      nextFollowUp: p.nextFollowUp ? p.nextFollowUp.slice(0, 10) : "",
      conversionDeadline: p.conversionDeadline ? p.conversionDeadline.slice(0, 10) : "",
      needsCallback: p.needsCallback,
      revenuePotential: String(p.revenuePotential || ""),
    });
    setShowForm(true);
  }

  const byStatus = (key: string) => prospects.filter(p => p.status === key);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">

      {/* ── Left: Filters ── */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-900 mb-3">Prospection</h1>
          <button
            onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setShowForm(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau prospect
          </button>
        </div>

        {/* Stats mini */}
        <div className="px-3 py-3 border-b border-gray-100 grid grid-cols-2 gap-2">
          <div className="bg-[#f5f5f7] rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Prospects</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-green-600">{convRate}%</p>
            <p className="text-xs text-gray-500">Conversion</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center ${todayFollowups > 0 ? "bg-orange-50" : "bg-[#f5f5f7]"}`}>
            <p className={`text-lg font-bold ${todayFollowups > 0 ? "text-orange-600" : "text-gray-900"}`}>{todayFollowups}</p>
            <p className="text-xs text-gray-500">Relances/j</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center ${hotProspects > 0 ? "bg-red-50" : "bg-[#f5f5f7]"}`}>
            <p className={`text-lg font-bold ${hotProspects > 0 ? "text-red-600" : "text-gray-900"}`}>{hotProspects}</p>
            <p className="text-xs text-gray-500">🔥 Chauds</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex-1 px-3 py-3 space-y-4">
          {/* Quick filters */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Accès rapide</p>
            <QuickFilter active={!filterStatus && !filterPriority && !filterTemperature && !filterCallback && !filterToday}
              onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterTemperature(""); setFilterCallback(false); setFilterToday(false); }}
              icon="🏠" label="Tous les prospects" count={total} />
            <QuickFilter active={filterToday} onClick={() => { setFilterToday(!filterToday); setFilterCallback(false); }}
              icon="📅" label="Relances aujourd'hui" count={todayFollowups} urgent={todayFollowups > 0} />
            <QuickFilter active={filterCallback} onClick={() => { setFilterCallback(!filterCallback); setFilterToday(false); }}
              icon="📞" label="À rappeler" count={prospects.filter(p => p.needsCallback).length} />
            <QuickFilter active={filterTemperature === "HOT"} onClick={() => setFilterTemperature(filterTemperature === "HOT" ? "" : "HOT")}
              icon="🔥" label="Prospects chauds" count={hotProspects} urgent={hotProspects > 0} />
          </div>

          {/* Status filter */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Par statut</p>
            <div className="space-y-1">
              {STATUSES.map(s => (
                <QuickFilter key={s.key} active={filterStatus === s.key}
                  onClick={() => setFilterStatus(filterStatus === s.key ? "" : s.key)}
                  dot={s.dot} label={s.label} count={prospects.filter(p => p.status === s.key).length} />
              ))}
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Par priorité</p>
            <div className="space-y-1">
              {PRIORITIES.map(p => (
                <QuickFilter key={p.key} active={filterPriority === p.key}
                  onClick={() => setFilterPriority(filterPriority === p.key ? "" : p.key)}
                  label={p.label} count={prospects.filter(pr => pr.priority === p.key).length} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un prospect..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
            />
          </div>

          {/* Alert: overdue */}
          {overdueFollowups > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              ⚠️ {overdueFollowups} relance{overdueFollowups > 1 ? "s" : ""} en retard
            </div>
          )}

          {/* View switcher */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 ml-auto gap-0.5">
            {[
              { k: "kanban", icon: "⬛", label: "Kanban" },
              { k: "table",  icon: "☰", label: "Tableau" },
              { k: "followups", icon: "📅", label: "Relances" },
            ].map(v => (
              <button key={v.k} onClick={() => setView(v.k as typeof view)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === v.k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>
          ) : view === "kanban" ? (
            <KanbanView
              prospects={prospects} byStatus={byStatus}
              onDetail={setDetail} onEdit={openEdit}
              onDelete={handleDelete} onStatusChange={handleStatusChange}
            />
          ) : view === "table" ? (
            <TableView
              prospects={prospects} onDetail={setDetail}
              onEdit={openEdit} onDelete={handleDelete} onStatusChange={handleStatusChange}
            />
          ) : (
            <FollowUpsView
              prospects={prospects} onDetail={setDetail} onEdit={openEdit}
            />
          )}
        </div>
      </div>

      {/* ── Detail Panel ── */}
      {detail && (
        <DetailPanel
          prospect={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={() => handleDelete(detail.id)}
          onStatusChange={(s) => handleStatusChange(detail, s)}
          newNote={newNote} setNewNote={setNewNote}
          noteType={noteType} setNoteType={setNoteType}
          onAddNote={handleAddNote} savingNote={savingNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <ProspectForm
          data={formData}
          onChange={(k, v) => setFormData(prev => ({ ...prev, [k]: v }))}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          saving={saving}
          isEdit={!!editingId}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK FILTER
═══════════════════════════════════════════════════════════════ */
function QuickFilter({ active, onClick, icon, dot, label, count, urgent }: {
  active: boolean; onClick: () => void; icon?: string; dot?: string;
  label: string; count?: number; urgent?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors text-left ${active ? "bg-[#0071e3]/10 text-[#0071e3] font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
      {icon && <span className="text-base leading-none">{icon}</span>}
      {dot && <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${dot}`} />}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${urgent && count > 0 ? "bg-red-100 text-red-700 font-semibold" : "bg-gray-100 text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROSPECT CARD (used in Kanban)
═══════════════════════════════════════════════════════════════ */
function ProspectCard({ prospect, onDetail, onEdit, onDelete, onStatusChange }: {
  prospect: Prospect;
  onDetail: (p: Prospect) => void;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  onStatusChange: (p: Prospect, status: string) => void;
}) {
  const temp  = getTemperature(prospect.temperature);
  const prio  = getPriority(prospect.priority);
  const overdueFollow = isOverdue(prospect.nextFollowUp) && prospect.status !== "CONVERTED" && prospect.status !== "LOST";
  const todayFollow   = isToday(prospect.nextFollowUp);

  return (
    <div
      onClick={() => onDetail(prospect)}
      className="bg-white rounded-xl border border-gray-200 p-3.5 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {prospect.firstName} {prospect.lastName}
          </p>
          {prospect.company && (
            <p className="text-xs text-gray-500 truncate">{prospect.position ? `${prospect.position} · ` : ""}{prospect.company}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span title={temp.label}>{temp.icon}</span>
          {prospect.needsCallback && <span title="À rappeler" className="text-blue-500 text-xs">📞</span>}
        </div>
      </div>

      {/* Priority */}
      {prospect.priority !== "MEDIUM" && (
        <span className={`text-xs font-medium ${prio.color}`}>
          {prospect.priority === "HIGH" ? "↑ Haute priorité" : "↓ Faible priorité"}
        </span>
      )}

      {/* Follow-up date */}
      {prospect.nextFollowUp && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 ${
          overdueFollow ? "bg-red-50 text-red-700" : todayFollow ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-500"
        }`}>
          <span>{overdueFollow ? "⚠️" : "📅"}</span>
          <span>{overdueFollow ? "En retard : " : todayFollow ? "Aujourd'hui : " : "Relance : "}{fmtDate(prospect.nextFollowUp, true)}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
        <span className="text-xs text-gray-400">{prospect._count.notes} note{prospect._count.notes !== 1 ? "s" : ""}</span>
        {prospect.revenuePotential > 0 && (
          <span className="text-xs font-medium text-green-600">{prospect.revenuePotential.toLocaleString("fr-FR")} €</span>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(prospect)} className="flex-1 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          Modifier
        </button>
        <button onClick={() => onDelete(prospect.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          ✕
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KANBAN VIEW
═══════════════════════════════════════════════════════════════ */
function KanbanView({ prospects, byStatus, onDetail, onEdit, onDelete, onStatusChange }: {
  prospects: Prospect[];
  byStatus: (key: string) => Prospect[];
  onDetail: (p: Prospect) => void;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  onStatusChange: (p: Prospect, status: string) => void;
}) {
  return (
    <div className="flex gap-4 p-5 h-full overflow-x-auto">
      {STATUSES.map(col => {
        const cards = byStatus(col.key);
        return (
          <div key={col.key} className="flex-shrink-0 w-72 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg ${col.color}`}>
                {col.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">{cards.length}</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {cards.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
                  <p className="text-xs text-gray-400">Aucun prospect</p>
                </div>
              )}
              {cards.map(p => (
                <ProspectCard key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TABLE VIEW
═══════════════════════════════════════════════════════════════ */
function TableView({ prospects, onDetail, onEdit, onDelete, onStatusChange }: {
  prospects: Prospect[];
  onDetail: (p: Prospect) => void;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
  onStatusChange: (p: Prospect, status: string) => void;
}) {
  return (
    <div className="p-5">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prospect</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Temp.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priorité</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Relance</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CA potentiel</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {prospects.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Aucun prospect trouvé</td></tr>
            )}
            {prospects.map(p => {
              const status = getStatus(p.status);
              const temp   = getTemperature(p.temperature);
              const prio   = getPriority(p.priority);
              const overdue = isOverdue(p.nextFollowUp) && p.status !== "CONVERTED" && p.status !== "LOST";
              const today  = isToday(p.nextFollowUp);
              return (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => onDetail(p)}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                      {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-gray-700">{p.company || "—"}</p>
                      {p.position && <p className="text-xs text-gray-400">{p.position}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg ${status.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-base">{temp.icon}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${prio.color}`}>{prio.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.nextFollowUp ? (
                      <span className={`text-xs font-medium ${overdue ? "text-red-600" : today ? "text-orange-600" : "text-gray-600"}`}>
                        {overdue ? "⚠️ " : today ? "📅 " : ""}{fmtDate(p.nextFollowUp, true)}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.revenuePotential > 0
                      ? <span className="text-sm font-medium text-green-600">{p.revenuePotential.toLocaleString("fr-FR")} €</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(p)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FOLLOW-UPS VIEW (calendar-style list)
═══════════════════════════════════════════════════════════════ */
function FollowUpsView({ prospects, onDetail, onEdit }: {
  prospects: Prospect[];
  onDetail: (p: Prospect) => void;
  onEdit: (p: Prospect) => void;
}) {
  const withFollowUp = prospects.filter(p => p.nextFollowUp && p.status !== "CONVERTED" && p.status !== "LOST")
    .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime());

  const overdue  = withFollowUp.filter(p => isOverdue(p.nextFollowUp) && !isToday(p.nextFollowUp));
  const todayList = withFollowUp.filter(p => isToday(p.nextFollowUp));
  const upcoming = withFollowUp.filter(p => !isOverdue(p.nextFollowUp) && !isToday(p.nextFollowUp));

  const noFollowUp = prospects.filter(p => !p.nextFollowUp && p.status !== "CONVERTED" && p.status !== "LOST");

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-6">
      {overdue.length > 0 && (
        <Section title={`⚠️ En retard (${overdue.length})`} bg="bg-red-50" border="border-red-200">
          {overdue.map(p => <FollowUpRow key={p.id} prospect={p} urgent onDetail={onDetail} onEdit={onEdit} />)}
        </Section>
      )}
      {todayList.length > 0 && (
        <Section title={`📅 Aujourd'hui (${todayList.length})`} bg="bg-orange-50" border="border-orange-200">
          {todayList.map(p => <FollowUpRow key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} />)}
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section title="🗓️ À venir" bg="bg-white" border="border-gray-200">
          {upcoming.map(p => <FollowUpRow key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} />)}
        </Section>
      )}
      {noFollowUp.length > 0 && (
        <Section title="⏳ Sans relance planifiée" bg="bg-gray-50" border="border-gray-200">
          {noFollowUp.map(p => <FollowUpRow key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} />)}
        </Section>
      )}
      {withFollowUp.length === 0 && noFollowUp.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">Aucune relance planifiée</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, bg, border, children }: { title: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border ${border} overflow-hidden`}>
      <div className={`px-4 py-3 ${bg} border-b ${border}`}>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
      </div>
      <div className="divide-y divide-gray-100 bg-white">
        {children}
      </div>
    </div>
  );
}

function FollowUpRow({ prospect, urgent, onDetail, onEdit }: {
  prospect: Prospect; urgent?: boolean;
  onDetail: (p: Prospect) => void; onEdit: (p: Prospect) => void;
}) {
  const temp = getTemperature(prospect.temperature);
  const status = getStatus(prospect.status);
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer group" onClick={() => onDetail(prospect)}>
      <span className="text-xl">{temp.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{prospect.firstName} {prospect.lastName}</p>
        <p className="text-xs text-gray-500">{prospect.company}{prospect.position ? ` · ${prospect.position}` : ""}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${status.color}`}>{status.label}</span>
      {prospect.nextFollowUp && (
        <span className={`text-xs font-semibold ${urgent ? "text-red-600" : "text-gray-600"}`}>
          {fmtDate(prospect.nextFollowUp, true)}
        </span>
      )}
      <button onClick={e => { e.stopPropagation(); onEdit(prospect); }}
        className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL PANEL
═══════════════════════════════════════════════════════════════ */
function DetailPanel({
  prospect, onClose, onEdit, onDelete, onStatusChange,
  newNote, setNewNote, noteType, setNoteType, onAddNote, savingNote, onDeleteNote,
}: {
  prospect: Prospect;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
  onStatusChange: (s: string) => void;
  newNote: string; setNewNote: (v: string) => void;
  noteType: string; setNoteType: (v: string) => void;
  onAddNote: () => void; savingNote: boolean;
  onDeleteNote: (id: string) => void;
}) {
  const status = getStatus(prospect.status);
  const temp   = getTemperature(prospect.temperature);
  const prio   = getPriority(prospect.priority);

  return (
    <div className="w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{temp.icon}</span>
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {prospect.firstName} {prospect.lastName}
            </h3>
          </div>
          {prospect.company && (
            <p className="text-sm text-gray-500">{prospect.position ? `${prospect.position} · ` : ""}{prospect.company}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status selector */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Statut</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => onStatusChange(s.key)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                  prospect.status === s.key
                    ? `${s.color} border-transparent`
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info grid */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations</p>

          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Priorité" value={<span className={`text-sm font-medium ${prio.color}`}>{prio.label}</span>} />
            <InfoItem label="Source" value={prospect.source} />
            {prospect.email && <InfoItem label="Email" value={<a href={`mailto:${prospect.email}`} className="text-[#0071e3] hover:underline truncate block text-sm">{prospect.email}</a>} />}
            {prospect.phone && <InfoItem label="Téléphone" value={prospect.phone} />}
          </div>

          {prospect.linkedinUrl && (
            <a href={prospect.linkedinUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#0071e3] hover:underline">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Voir le profil LinkedIn
            </a>
          )}

          {prospect.revenuePotential > 0 && (
            <InfoItem label="CA potentiel" value={<span className="text-green-600 font-semibold text-sm">{prospect.revenuePotential.toLocaleString("fr-FR")} €</span>} />
          )}
        </div>

        {/* Dates */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dates</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Premier contact" value={fmtDate(prospect.firstContactDate, true)} />
            <InfoItem label="Dernière interaction" value={fmtDate(prospect.lastInteraction, true)} />
            <InfoItem label="Prochaine relance" value={
              <span className={prospect.nextFollowUp && isOverdue(prospect.nextFollowUp) ? "text-red-600 font-medium text-sm" : "text-sm text-gray-700"}>
                {fmtDate(prospect.nextFollowUp, true)}
              </span>
            } />
            <InfoItem label="Deadline conversion" value={fmtDate(prospect.conversionDeadline, true)} />
          </div>
          {prospect.needsCallback && (
            <div className="flex items-center gap-2 mt-1 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
              📞 À rappeler
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Historique ({prospect._count.notes})
          </p>

          {/* Add note */}
          <div className="mb-4 space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(t => (
                <button key={t.key} onClick={() => setNoteType(t.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    noteType === t.key ? "bg-[#0071e3] text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Ajouter une note, un compte-rendu d'appel..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
            />
            <button
              onClick={onAddNote}
              disabled={!newNote.trim() || savingNote}
              className="w-full py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
            >
              {savingNote ? "Ajout..." : "Ajouter la note"}
            </button>
          </div>

          {/* Notes list */}
          <div className="space-y-3">
            {prospect.notes.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">Aucune note pour l&apos;instant</p>
            )}
            {prospect.notes.map(note => {
              const nt = NOTE_TYPES.find(t => t.key === note.type) ?? NOTE_TYPES[0];
              return (
                <div key={note.id} className="bg-gray-50 rounded-xl p-3 group relative">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs">{nt.icon}</span>
                    <span className="text-xs font-medium text-gray-600">{nt.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">{fmtDateTime(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  <button onClick={() => onDeleteNote(note.id)}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {typeof value === "string" ? <p className="text-sm text-gray-700">{value || "—"}</p> : value}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROSPECT FORM MODAL
═══════════════════════════════════════════════════════════════ */
function ProspectForm({ data, onChange, onSubmit, onClose, saving, isEdit }: {
  data: typeof EMPTY_FORM;
  onChange: (k: string, v: string | boolean) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Modifier le prospect" : "Nouveau prospect"}
          </h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Identité */}
          <FormSection title="Identité">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom *" value={data.firstName} onChange={v => onChange("firstName", v)} placeholder="Jean" />
              <Field label="Nom *" value={data.lastName} onChange={v => onChange("lastName", v)} placeholder="Dupont" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" value={data.email} onChange={v => onChange("email", v)} placeholder="jean@entreprise.fr" type="email" />
              <Field label="Téléphone" value={data.phone} onChange={v => onChange("phone", v)} placeholder="+33 6 00 00 00 00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entreprise" value={data.company} onChange={v => onChange("company", v)} placeholder="Acme Corp" />
              <Field label="Poste" value={data.position} onChange={v => onChange("position", v)} placeholder="CEO, Directeur marketing..." />
            </div>
            <Field label="Lien profil LinkedIn" value={data.linkedinUrl} onChange={v => onChange("linkedinUrl", v)} placeholder="https://linkedin.com/in/..." />
          </FormSection>

          {/* Qualification */}
          <FormSection title="Qualification">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
                <select value={data.source} onChange={e => onChange("source", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
                <select value={data.priority} onChange={e => onChange("priority", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                  {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Température</label>
                <select value={data.temperature} onChange={e => onChange("temperature", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                  {TEMPERATURES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
                <select value={data.status} onChange={e => onChange("status", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white">
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <Field label="CA potentiel (€)" value={String(data.revenuePotential)} onChange={v => onChange("revenuePotential", v)} placeholder="0" type="number" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <input type="checkbox" id="callback" checked={data.needsCallback}
                onChange={e => onChange("needsCallback", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#0071e3] focus:ring-[#0071e3]" />
              <label htmlFor="callback" className="text-sm text-gray-700 cursor-pointer">📞 À rappeler</label>
            </div>
          </FormSection>

          {/* Dates */}
          <FormSection title="Suivi temporel">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date de premier contact" value={data.firstContactDate} onChange={v => onChange("firstContactDate", v)} type="date" />
              <Field label="Dernière interaction" value={data.lastInteraction} onChange={v => onChange("lastInteraction", v)} type="date" />
              <Field label="Prochaine relance" value={data.nextFollowUp} onChange={v => onChange("nextFollowUp", v)} type="date" />
              <Field label="Deadline de conversion" value={data.conversionDeadline} onChange={v => onChange("conversionDeadline", v)} type="date" />
            </div>
          </FormSection>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || !data.firstName || !data.lastName}
            className="px-6 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
          >
            {saving ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer le prospect"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
      />
    </div>
  );
}
