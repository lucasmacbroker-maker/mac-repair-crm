"use client";

import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────── Types ─────────────────────────── */
interface ProspectNote {
  id: string;
  content: string;
  type: string;
  createdAt: string;
}

interface ProspectAttachment {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
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
  service: string;
  priority: string;
  firstContactDate: string | null;
  lastInteraction: string | null;
  nextFollowUp: string | null;
  conversionDeadline: string | null;
  needsCallback: boolean;
  revenuePotential: number;
  notes: ProspectNote[];
  attachments: ProspectAttachment[];
  _count: { notes: number };
  createdAt: string;
}

/* ─────────────────────────── Constants ─────────────────────────── */
const SERVICES = [
  { key: "REPAIR",  label: "Réparation", icon: "🔧", color: "bg-blue-100 text-blue-700",   border: "border-blue-200",  dot: "bg-blue-500" },
  { key: "BUYBACK", label: "Rachat",     icon: "💰", color: "bg-green-100 text-green-700", border: "border-green-200", dot: "bg-green-500" },
  { key: "BOTH",    label: "Les deux",   icon: "⭐", color: "bg-purple-100 text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
];

const PRIORITIES = [
  { key: "LOW",    label: "Faible",  color: "text-gray-400",  bg: "bg-gray-100" },
  { key: "MEDIUM", label: "Moyenne", color: "text-blue-600",  bg: "bg-blue-50" },
  { key: "HIGH",   label: "Haute",   color: "text-red-600",   bg: "bg-red-50" },
];

const SOURCES = ["LinkedIn", "Recommandation", "Événement", "Site web", "Email", "Téléphone", "Autre"];

const NOTE_TYPES = [
  { key: "NOTE",     label: "Note",     icon: "📝" },
  { key: "CALL",     label: "Appel",    icon: "📞" },
  { key: "EMAIL",    label: "Email",    icon: "📧" },
  { key: "LINKEDIN", label: "LinkedIn", icon: "💼" },
  { key: "MEETING",  label: "RDV",      icon: "🤝" },
];

const EMPTY_FORM = {
  firstName: "", lastName: "", email: "", phone: "", company: "",
  position: "", linkedinUrl: "", source: "LinkedIn",
  service: "REPAIR", priority: "MEDIUM",
  firstContactDate: "", nextFollowUp: "", conversionDeadline: "",
  needsCallback: false, revenuePotential: "",
  initialComment: "",
};

/* ─────────────────────────── Helpers ─────────────────────────── */
function getService(key: string) { return SERVICES.find(s => s.key === key) ?? SERVICES[0]; }
function getPriority(key: string) { return PRIORITIES.find(p => p.key === key) ?? PRIORITIES[1]; }

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "https://" + url;
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function fmtDate(dateStr: string | null, short = false) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", short
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/* ══════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════ */
export default function ProspectionPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"kanban" | "table" | "followups">("kanban");
  const [search, setSearch]       = useState("");
  const [filterService, setFilterService]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCallback, setFilterCallback] = useState(false);
  const [filterToday, setFilterToday]       = useState(false);

  const [showForm, setShowForm]   = useState(false);
  const [formData, setFormData]   = useState({ ...EMPTY_FORM });
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [saving, setSaving]       = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [detail, setDetail]           = useState<Prospect | null>(null);
  const [newNote, setNewNote]         = useState("");
  const [noteType, setNoteType]       = useState("NOTE");
  const [savingNote, setSavingNote]   = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  /* ── Fetch ── */
  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterService)  params.set("service", filterService);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterCallback) params.set("needsCallback", "true");
      if (filterToday)    params.set("followUpToday", "true");
      if (search)         params.set("search", search);
      const res = await fetch(`/api/prospects?${params}`);
      if (res.ok) setProspects(await res.json());
    } catch { /**/ }
    setLoading(false);
  }, [filterService, filterPriority, filterCallback, filterToday, search]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  /* ── Stats ── */
  const total        = prospects.length;
  const todayCount   = prospects.filter(p => isToday(p.nextFollowUp)).length;
  const overdueCount = prospects.filter(p => isOverdue(p.nextFollowUp) && !isToday(p.nextFollowUp)).length;
  const callbackCount = prospects.filter(p => p.needsCallback).length;

  /* ── CRUD ── */
  async function handleSubmit() {
    if (!formData.firstName || !formData.lastName) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        revenuePotential: parseFloat(String(formData.revenuePotential)) || 0,
        firstContactDate: formData.firstContactDate || null,
        nextFollowUp: formData.nextFollowUp || null,
        conversionDeadline: formData.conversionDeadline || null,
      };
      const url    = editingId ? `/api/prospects/${editingId}` : "/api/prospects";
      const method = editingId ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved: Prospect = await res.json();

      if (!editingId) {
        if (formData.initialComment.trim()) {
          await fetch(`/api/prospects/${saved.id}/notes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: formData.initialComment, type: "NOTE" }),
          });
        }
        for (const file of formFiles) {
          const fd = new FormData(); fd.append("file", file);
          await fetch(`/api/prospects/${saved.id}/attachments`, { method: "POST", body: fd });
        }
        const fresh = await fetch(`/api/prospects/${saved.id}`);
        const freshData: Prospect = fresh.ok ? await fresh.json() : saved;
        setProspects(prev => [freshData, ...prev]);
      } else {
        setProspects(prev => prev.map(p => p.id === editingId ? saved : p));
        if (detail?.id === editingId) setDetail(saved);
      }

      setShowForm(false); setEditingId(null);
      setFormData({ ...EMPTY_FORM }); setFormFiles([]);
    } catch { alert("Erreur lors de l'enregistrement"); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce prospect ?")) return;
    await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    setProspects(prev => prev.filter(p => p.id !== id));
    if (detail?.id === id) setDetail(null);
  }

  async function handleServiceChange(prospect: Prospect, service: string) {
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service }),
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote, type: noteType }),
    });
    if (res.ok) {
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
    if (res.ok) { const u = await res.json(); setDetail(u); setProspects(prev => prev.map(p => p.id === detail.id ? u : p)); }
  }

  async function handleUploadAttachment(file: File) {
    if (!detail) return;
    setUploadingFile(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`/api/prospects/${detail.id}/attachments`, { method: "POST", body: fd });
    if (res.ok) {
      const res2 = await fetch(`/api/prospects/${detail.id}`);
      if (res2.ok) { const u = await res2.json(); setDetail(u); setProspects(prev => prev.map(p => p.id === detail.id ? u : p)); }
    } else { const e = await res.json(); alert(e.error || "Erreur upload"); }
    setUploadingFile(false);
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!detail) return;
    await fetch(`/api/prospects/${detail.id}/attachments?attachmentId=${attachmentId}`, { method: "DELETE" });
    const res = await fetch(`/api/prospects/${detail.id}`);
    if (res.ok) { const u = await res.json(); setDetail(u); setProspects(prev => prev.map(p => p.id === detail.id ? u : p)); }
  }

  function openEdit(p: Prospect) {
    setEditingId(p.id);
    setFormFiles([]);
    setFormData({
      firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone,
      company: p.company, position: p.position, linkedinUrl: p.linkedinUrl, source: p.source,
      service: p.service, priority: p.priority,
      firstContactDate: p.firstContactDate?.slice(0, 10) ?? "",
      nextFollowUp: p.nextFollowUp?.slice(0, 10) ?? "",
      conversionDeadline: p.conversionDeadline?.slice(0, 10) ?? "",
      needsCallback: p.needsCallback,
      revenuePotential: String(p.revenuePotential || ""),
      initialComment: "",
    });
    setShowForm(true);
  }

  const byService = (key: string) => prospects.filter(p => p.service === key);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">

      {/* ── Sidebar ── */}
      <div className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-900 mb-3">Prospection B2B</h1>
          <button
            onClick={() => { setEditingId(null); setFormData({ ...EMPTY_FORM }); setFormFiles([]); setShowForm(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau prospect
          </button>
        </div>

        {/* Stats */}
        <div className="px-3 py-3 border-b border-gray-100 grid grid-cols-2 gap-2">
          <div className="bg-[#f5f5f7] rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className={`rounded-xl p-2.5 text-center ${todayCount > 0 ? "bg-orange-50" : "bg-[#f5f5f7]"}`}>
            <p className={`text-lg font-bold ${todayCount > 0 ? "text-orange-600" : "text-gray-900"}`}>{todayCount}</p>
            <p className="text-xs text-gray-500">Relances/j</p>
          </div>
          {SERVICES.map(s => (
            <div key={s.key} className="bg-[#f5f5f7] rounded-xl p-2.5 text-center">
              <p className="text-lg font-bold text-gray-900">{byService(s.key).length}</p>
              <p className="text-xs text-gray-500">{s.icon} {s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex-1 px-3 py-3 space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Accès rapide</p>
            <QuickFilter active={!filterService && !filterPriority && !filterCallback && !filterToday}
              onClick={() => { setFilterService(""); setFilterPriority(""); setFilterCallback(false); setFilterToday(false); }}
              icon="🏠" label="Tous les prospects" count={total} />
            <QuickFilter active={filterToday}
              onClick={() => { setFilterToday(!filterToday); setFilterCallback(false); }}
              icon="📅" label="Relances aujourd'hui" count={todayCount} urgent={todayCount > 0} />
            <QuickFilter active={filterCallback}
              onClick={() => { setFilterCallback(!filterCallback); setFilterToday(false); }}
              icon="📞" label="À rappeler" count={callbackCount} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Par service</p>
            <div className="space-y-1">
              {SERVICES.map(s => (
                <QuickFilter key={s.key} active={filterService === s.key}
                  onClick={() => setFilterService(filterService === s.key ? "" : s.key)}
                  icon={s.icon} label={s.label} count={byService(s.key).length} />
              ))}
            </div>
          </div>

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
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" />
          </div>

          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              ⚠️ {overdueCount} relance{overdueCount > 1 ? "s" : ""} en retard
            </div>
          )}

          <div className="flex items-center bg-gray-100 rounded-xl p-1 ml-auto gap-0.5">
            {[
              { k: "kanban",    label: "Kanban" },
              { k: "table",     label: "Tableau" },
              { k: "followups", label: "Relances" },
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
            <KanbanView prospects={prospects} byService={byService}
              onDetail={setDetail} onEdit={openEdit} onDelete={handleDelete} onServiceChange={handleServiceChange} />
          ) : view === "table" ? (
            <TableView prospects={prospects} onDetail={setDetail} onEdit={openEdit} onDelete={handleDelete} />
          ) : (
            <FollowUpsView prospects={prospects} onDetail={setDetail} onEdit={openEdit} />
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {detail && (
        <DetailPanel
          prospect={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={() => handleDelete(detail.id)}
          onServiceChange={(s) => handleServiceChange(detail, s)}
          newNote={newNote} setNewNote={setNewNote}
          noteType={noteType} setNoteType={setNoteType}
          onAddNote={handleAddNote} savingNote={savingNote}
          onDeleteNote={handleDeleteNote}
          onUploadAttachment={handleUploadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          uploadingFile={uploadingFile}
        />
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <ProspectForm
          data={formData}
          onChange={(k, v) => setFormData(prev => ({ ...prev, [k]: v }))}
          files={formFiles} onFilesChange={setFormFiles}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditingId(null); setFormFiles([]); }}
          saving={saving} isEdit={!!editingId}
        />
      )}
    </div>
  );
}

/* ── QuickFilter ── */
function QuickFilter({ active, onClick, icon, label, count, urgent }: {
  active: boolean; onClick: () => void; icon?: string; label: string; count?: number; urgent?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition-colors text-left ${active ? "bg-[#0071e3]/10 text-[#0071e3] font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
      {icon && <span className="text-base leading-none">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${urgent && count > 0 ? "bg-red-100 text-red-700 font-semibold" : "bg-gray-100 text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ── Prospect Card (Kanban) ── */
function ProspectCard({ prospect, onDetail, onEdit, onDelete }: {
  prospect: Prospect;
  onDetail: (p: Prospect) => void;
  onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void;
}) {
  const svc  = getService(prospect.service);
  const prio = getPriority(prospect.priority);
  const overdueFollow = isOverdue(prospect.nextFollowUp);
  const todayFollow   = isToday(prospect.nextFollowUp);

  return (
    <div onClick={() => onDetail(prospect)}
      className="bg-white rounded-xl border border-gray-200 p-3.5 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{prospect.firstName} {prospect.lastName}</p>
          {prospect.company && (
            <p className="text-xs text-gray-500 truncate">{prospect.position ? `${prospect.position} · ` : ""}{prospect.company}</p>
          )}
        </div>
        {prospect.needsCallback && <span className="text-blue-500 text-xs flex-shrink-0">📞</span>}
      </div>

      {prospect.priority !== "MEDIUM" && (
        <span className={`text-xs font-medium ${prio.color}`}>
          {prospect.priority === "HIGH" ? "↑ Haute priorité" : "↓ Faible"}
        </span>
      )}

      {prospect.nextFollowUp && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 ${
          overdueFollow ? "bg-red-50 text-red-700" : todayFollow ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-500"
        }`}>
          <span>{overdueFollow ? "⚠️" : "📅"}</span>
          <span>{overdueFollow ? "En retard : " : todayFollow ? "Aujourd'hui : " : ""}{fmtDate(prospect.nextFollowUp, true)}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
        <span className="text-xs text-gray-400">{prospect._count.notes} note{prospect._count.notes !== 1 ? "s" : ""}</span>
        {prospect.revenuePotential > 0 && (
          <span className="text-xs font-medium text-green-600">{prospect.revenuePotential.toLocaleString("fr-FR")} €</span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(prospect)} className="flex-1 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          Modifier
        </button>
        {prospect.linkedinUrl && (
          <a href={normalizeUrl(prospect.linkedinUrl)} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="px-2 py-1 text-xs text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded-lg transition-colors font-semibold">
            in
          </a>
        )}
        <button onClick={() => onDelete(prospect.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">✕</button>
      </div>
    </div>
  );
}

/* ── Kanban ── */
function KanbanView({ prospects, byService, onDetail, onEdit, onDelete, onServiceChange }: {
  prospects: Prospect[]; byService: (k: string) => Prospect[];
  onDetail: (p: Prospect) => void; onEdit: (p: Prospect) => void;
  onDelete: (id: string) => void; onServiceChange: (p: Prospect, s: string) => void;
}) {
  return (
    <div className="flex gap-5 p-5 h-full">
      {SERVICES.map(col => {
        const cards = byService(col.key);
        return (
          <div key={col.key} className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-xl ${col.color}`}>
                {col.icon} {col.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">{cards.length}</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {cards.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-xs text-gray-400">Aucun prospect</p>
                </div>
              )}
              {cards.map(p => (
                <ProspectCard key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Table ── */
function TableView({ prospects, onDetail, onEdit, onDelete }: {
  prospects: Prospect[]; onDetail: (p: Prospect) => void;
  onEdit: (p: Prospect) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="p-5">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Prospect", "Entreprise", "Service", "Priorité", "Prochaine relance", "CA potentiel", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {prospects.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Aucun prospect trouvé</td></tr>
            )}
            {prospects.map(p => {
              const svc  = getService(p.service);
              const prio = getPriority(p.priority);
              const overdue = isOverdue(p.nextFollowUp);
              const today   = isToday(p.nextFollowUp);
              return (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer group" onClick={() => onDetail(p)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{p.company || "—"}</p>
                    {p.position && <p className="text-xs text-gray-400">{p.position}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-xl ${svc.color}`}>
                      {svc.icon} {svc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${prio.bg} ${prio.color}`}>{prio.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {p.nextFollowUp
                      ? <span className={`text-xs font-medium ${overdue ? "text-red-600" : today ? "text-orange-600" : "text-gray-600"}`}>
                          {overdue ? "⚠️ " : today ? "📅 " : ""}{fmtDate(p.nextFollowUp, true)}
                        </span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {p.revenuePotential > 0
                      ? <span className="text-sm font-medium text-green-600">{p.revenuePotential.toLocaleString("fr-FR")} €</span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.linkedinUrl && (
                        <a href={normalizeUrl(p.linkedinUrl)} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-[#0A66C2] hover:bg-[#0A66C2]/10 rounded-lg" title="LinkedIn">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </a>
                      )}
                      <button onClick={() => onEdit(p)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

/* ── Follow-ups ── */
function FollowUpsView({ prospects, onDetail, onEdit }: {
  prospects: Prospect[]; onDetail: (p: Prospect) => void; onEdit: (p: Prospect) => void;
}) {
  const withDate = prospects.filter(p => p.nextFollowUp)
    .sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime());
  const overdue  = withDate.filter(p => isOverdue(p.nextFollowUp) && !isToday(p.nextFollowUp));
  const todayList = withDate.filter(p => isToday(p.nextFollowUp));
  const upcoming  = withDate.filter(p => !isOverdue(p.nextFollowUp) && !isToday(p.nextFollowUp));
  const noDate    = prospects.filter(p => !p.nextFollowUp);

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      {overdue.length > 0 && (
        <FSection title={`⚠️ En retard (${overdue.length})`} bg="bg-red-50" border="border-red-200">
          {overdue.map(p => <FRow key={p.id} prospect={p} urgent onDetail={onDetail} onEdit={onEdit} />)}
        </FSection>
      )}
      {todayList.length > 0 && (
        <FSection title={`📅 Aujourd'hui (${todayList.length})`} bg="bg-orange-50" border="border-orange-200">
          {todayList.map(p => <FRow key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} />)}
        </FSection>
      )}
      {upcoming.length > 0 && (
        <FSection title="🗓️ À venir" bg="bg-white" border="border-gray-200">
          {upcoming.map(p => <FRow key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} />)}
        </FSection>
      )}
      {noDate.length > 0 && (
        <FSection title="⏳ Sans relance planifiée" bg="bg-gray-50" border="border-gray-200">
          {noDate.map(p => <FRow key={p.id} prospect={p} onDetail={onDetail} onEdit={onEdit} />)}
        </FSection>
      )}
      {prospects.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">Aucun prospect</p>
        </div>
      )}
    </div>
  );
}

function FSection({ title, bg, border, children }: { title: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border ${border} overflow-hidden`}>
      <div className={`px-4 py-3 ${bg} border-b ${border}`}><p className="text-sm font-semibold text-gray-800">{title}</p></div>
      <div className="divide-y divide-gray-100 bg-white">{children}</div>
    </div>
  );
}

function FRow({ prospect, urgent, onDetail, onEdit }: {
  prospect: Prospect; urgent?: boolean;
  onDetail: (p: Prospect) => void; onEdit: (p: Prospect) => void;
}) {
  const svc = getService(prospect.service);
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer group" onClick={() => onDetail(prospect)}>
      <span className="text-xl">{svc.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{prospect.firstName} {prospect.lastName}</p>
        <p className="text-xs text-gray-500">{prospect.company}{prospect.position ? ` · ${prospect.position}` : ""}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-xl ${svc.color}`}>{svc.label}</span>
      {prospect.nextFollowUp && (
        <span className={`text-xs font-semibold ${urgent ? "text-red-600" : "text-gray-600"}`}>
          {fmtDate(prospect.nextFollowUp, true)}
        </span>
      )}
      <button onClick={e => { e.stopPropagation(); onEdit(prospect); }}
        className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
    </div>
  );
}

/* ── Detail Panel ── */
function DetailPanel({
  prospect, onClose, onEdit, onDelete, onServiceChange,
  newNote, setNewNote, noteType, setNoteType, onAddNote, savingNote, onDeleteNote,
  onUploadAttachment, onDeleteAttachment, uploadingFile,
}: {
  prospect: Prospect; onClose: () => void; onEdit: () => void; onDelete: () => void;
  onServiceChange: (s: string) => void;
  newNote: string; setNewNote: (v: string) => void;
  noteType: string; setNoteType: (v: string) => void;
  onAddNote: () => void; savingNote: boolean; onDeleteNote: (id: string) => void;
  onUploadAttachment: (f: File) => void; onDeleteAttachment: (id: string) => void; uploadingFile: boolean;
}) {
  const svc  = getService(prospect.service);
  const prio = getPriority(prospect.priority);

  return (
    <div className="w-96 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="text-base font-semibold text-gray-900 truncate">{prospect.firstName} {prospect.lastName}</h3>
          {prospect.company && <p className="text-sm text-gray-500">{prospect.position ? `${prospect.position} · ` : ""}{prospect.company}</p>}
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-xl mt-2 ${svc.color}`}>
            {svc.icon} {svc.label}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Changer service */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Service</p>
          <div className="flex gap-2">
            {SERVICES.map(s => (
              <button key={s.key} onClick={() => onServiceChange(s.key)}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
                  prospect.service === s.key ? `${s.color} border-transparent` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Infos */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Informations</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Priorité" value={<span className={`text-sm font-medium ${prio.color}`}>{prio.label}</span>} />
            <InfoItem label="Source" value={prospect.source} />
            {prospect.email && <InfoItem label="Email" value={<a href={`mailto:${prospect.email}`} className="text-[#0071e3] hover:underline text-sm truncate block">{prospect.email}</a>} />}
            {prospect.phone && <InfoItem label="Téléphone" value={prospect.phone} />}
          </div>
          {prospect.linkedinUrl && (
            <a href={normalizeUrl(prospect.linkedinUrl)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-white bg-[#0A66C2] hover:bg-[#004182] px-3 py-2 rounded-xl w-fit transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              Ouvrir LinkedIn
            </a>
          )}
          {prospect.revenuePotential > 0 && (
            <InfoItem label="CA potentiel" value={<span className="text-green-600 font-semibold text-sm">{prospect.revenuePotential.toLocaleString("fr-FR")} €</span>} />
          )}
          {prospect.needsCallback && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">📞 À rappeler</div>
          )}
        </div>

        {/* Dates */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dates</p>
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="Premier contact" value={fmtDate(prospect.firstContactDate, true)} />
            <InfoItem label="Dernière interaction" value={fmtDate(prospect.lastInteraction, true)} />
            <InfoItem label="Prochaine relance" value={
              <span className={prospect.nextFollowUp && isOverdue(prospect.nextFollowUp) ? "text-red-600 font-medium text-sm" : "text-sm text-gray-700"}>
                {fmtDate(prospect.nextFollowUp, true)}
              </span>
            } />
            <InfoItem label="Deadline" value={fmtDate(prospect.conversionDeadline, true)} />
          </div>
        </div>

        {/* Documents */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Documents ({prospect.attachments?.length ?? 0})
            </p>
            <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl cursor-pointer transition-colors ${uploadingFile ? "bg-gray-100 text-gray-400" : "bg-[#0071e3]/10 text-[#0071e3] hover:bg-[#0071e3]/20"}`}>
              {uploadingFile ? "⏳ Upload..." : <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Ajouter
              </>}
              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" disabled={uploadingFile}
                onChange={e => { if (e.target.files?.[0]) { onUploadAttachment(e.target.files[0]); e.target.value = ""; } }} />
            </label>
          </div>
          {(!prospect.attachments || prospect.attachments.length === 0) ? (
            <p className="text-xs text-gray-400 text-center py-2">Aucun document</p>
          ) : (
            <div className="space-y-2">
              {prospect.attachments.map(att => (
                <div key={att.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl group">
                  <span className="text-lg">{att.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                  <div className="flex-1 min-w-0">
                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-medium text-[#0071e3] hover:underline truncate block">{att.fileName}</a>
                    <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button onClick={() => onDeleteAttachment(att.id)}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Historique ({prospect._count.notes})
          </p>
          <div className="mb-4 space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {NOTE_TYPES.map(t => (
                <button key={t.key} onClick={() => setNoteType(t.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${noteType === t.key ? "bg-[#0071e3] text-white border-transparent" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
              placeholder="Ajouter une note, compte-rendu d'appel..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none" />
            <button onClick={onAddNote} disabled={!newNote.trim() || savingNote}
              className="w-full py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors">
              {savingNote ? "Ajout..." : "Ajouter"}
            </button>
          </div>
          <div className="space-y-3">
            {prospect.notes.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Aucune note</p>}
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
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

/* ── Form Modal ── */
function ProspectForm({ data, onChange, files, onFilesChange, onSubmit, onClose, saving, isEdit }: {
  data: typeof EMPTY_FORM;
  onChange: (k: string, v: string | boolean) => void;
  files: File[]; onFilesChange: (f: File[]) => void;
  onSubmit: () => void; onClose: () => void;
  saving: boolean; isEdit: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{isEdit ? "Modifier le prospect" : "Nouveau prospect"}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Service */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Service proposé</p>
            <div className="grid grid-cols-3 gap-3">
              {SERVICES.map(s => (
                <button key={s.key} type="button" onClick={() => onChange("service", s.key)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    data.service === s.key
                      ? `${s.color} ${s.border}`
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}>
                  <span className="text-2xl block mb-1">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Identité */}
          <FormSection title="Contact">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom *" value={data.firstName} onChange={v => onChange("firstName", v)} placeholder="Jean" />
              <Field label="Nom *" value={data.lastName} onChange={v => onChange("lastName", v)} placeholder="Dupont" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entreprise" value={data.company} onChange={v => onChange("company", v)} placeholder="Acme Corp" />
              <Field label="Poste" value={data.position} onChange={v => onChange("position", v)} placeholder="Directeur informatique..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" value={data.email} onChange={v => onChange("email", v)} placeholder="jean@acme.fr" type="email" />
              <Field label="Téléphone" value={data.phone} onChange={v => onChange("phone", v)} placeholder="+33 6 00 00 00 00" />
            </div>
            <Field label="Lien profil LinkedIn" value={data.linkedinUrl} onChange={v => onChange("linkedinUrl", v)} placeholder="https://linkedin.com/in/..." />
          </FormSection>

          {/* Qualification */}
          <FormSection title="Qualification">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
                <select value={data.source} onChange={e => onChange("source", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 bg-white">
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
                <select value={data.priority} onChange={e => onChange("priority", e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 bg-white">
                  {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <Field label="CA potentiel (€)" value={String(data.revenuePotential)} onChange={v => onChange("revenuePotential", v)} placeholder="0" type="number" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="cb" checked={data.needsCallback} onChange={e => onChange("needsCallback", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#0071e3]" />
              <label htmlFor="cb" className="text-sm text-gray-700 cursor-pointer">📞 À rappeler</label>
            </div>
          </FormSection>

          {/* Dates */}
          <FormSection title="Suivi">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Premier contact" value={data.firstContactDate} onChange={v => onChange("firstContactDate", v)} type="date" />
              <Field label="Prochaine relance" value={data.nextFollowUp} onChange={v => onChange("nextFollowUp", v)} type="date" />
              <Field label="Deadline" value={data.conversionDeadline} onChange={v => onChange("conversionDeadline", v)} type="date" />
            </div>
          </FormSection>

          {/* Commentaire + docs (création uniquement) */}
          {!isEdit && (
            <FormSection title="Commentaire & Documents">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire initial</label>
                <textarea value={data.initialComment} onChange={e => onChange("initialComment", e.target.value)}
                  placeholder="Premier échange, contexte, besoins identifiés..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 resize-none" />
              </div>
              <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#0071e3] hover:bg-[#0071e3]/5 transition-colors">
                <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="text-sm text-gray-500">Ajouter des documents</span>
                <span className="text-xs text-gray-400">PDF, PNG, JPG — max 10 Mo</span>
                <input type="file" multiple className="hidden" accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => { if (e.target.files) { onFilesChange([...files, ...Array.from(e.target.files)]); e.target.value = ""; } }} />
              </label>
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                      <span>{f.type === "application/pdf" ? "📄" : "🖼️"}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} Ko</span>
                      <button type="button" onClick={() => onFilesChange(files.filter((_, j) => j !== i))}
                        className="text-gray-300 hover:text-red-500">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Annuler</button>
          <button onClick={onSubmit} disabled={saving || !data.firstName || !data.lastName}
            className="px-6 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors">
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
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]" />
    </div>
  );
}
