"use client";

import { useState, useEffect, useRef } from "react";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
  projectId: string | null;
  position: number;
  createdAt: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  color: string;
  tasks: Task[];
}

const COLORS = [
  "#0071e3", "#34c759", "#ff9500", "#ff3b30",
  "#af52de", "#ff2d55", "#5ac8fa", "#ffcc00",
];

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-red-100 text-red-700",
};

const COLUMNS = [
  { key: "TODO", label: "À faire", color: "text-gray-600", bg: "bg-gray-100" },
  { key: "IN_PROGRESS", label: "En cours", color: "text-blue-700", bg: "bg-blue-100" },
  { key: "DONE", label: "Terminé", color: "text-green-700", bg: "bg-green-100" },
];

export default function ProjetsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>("__todos__");
  const [loading, setLoading] = useState(true);

  // New project modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);
  const [savingProject, setSavingProject] = useState(false);

  // New task modal
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE">("TODO");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Edit task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL");
  const [editTaskDue, setEditTaskDue] = useState("");

  // Edit project
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");
  const [editProjectColor, setEditProjectColor] = useState(COLORS[0]);

  // Standalone todos (no project)
  const [standaloneTasks, setStandaloneTasks] = useState<Task[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const todoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error();
      const data: Project[] = await res.json();
      setProjects(data);

      // Fetch standalone tasks (no project)
      const tasksRes = await fetch("/api/tasks?projectId=null");
      if (tasksRes.ok) {
        // We'll get them from projects fetch but standalone ones aren't attached
        // Actually we need to fetch them differently
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function fetchStandaloneTasks() {
    // Get standalone tasks by looking at the DB - we'll add a special endpoint
    // For now, manage via state after create
  }

  async function createProject() {
    if (!newProjectTitle.trim()) return;
    setSavingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newProjectTitle, description: newProjectDesc, color: newProjectColor }),
      });
      if (!res.ok) throw new Error();
      const project: Project = await res.json();
      setProjects(prev => [...prev, project]);
      setSelectedProjectId(project.id);
      setShowNewProject(false);
      setNewProjectTitle("");
      setNewProjectDesc("");
      setNewProjectColor(COLORS[0]);
    } catch {
      alert("Erreur lors de la création du projet");
    }
    setSavingProject(false);
  }

  async function deleteProject(projectId: string) {
    if (!confirm("Supprimer ce projet et toutes ses tâches ?")) return;
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProjectId === projectId) setSelectedProjectId("__todos__");
    } catch {
      alert("Erreur lors de la suppression");
    }
  }

  async function saveEditProject() {
    if (!editingProject || !editProjectTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editProjectTitle, description: editProjectDesc, color: editProjectColor }),
      });
      if (!res.ok) throw new Error();
      const updated: Project = await res.json();
      setProjects(prev => prev.map(p => p.id === updated.id ? { ...updated, tasks: p.tasks } : p));
      setEditingProject(null);
    } catch {
      alert("Erreur lors de la modification");
    }
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return;
    setSavingTask(true);
    const projectId = selectedProjectId === "__todos__" ? null : selectedProjectId;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          status: newTaskStatus,
          priority: newTaskPriority,
          dueDate: newTaskDue || null,
          projectId,
        }),
      });
      if (!res.ok) throw new Error();
      const task: Task = await res.json();

      if (projectId === null) {
        setStandaloneTasks(prev => [...prev, task]);
      } else {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p
        ));
      }

      setShowNewTask(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskPriority("NORMAL");
      setNewTaskDue("");
    } catch {
      alert("Erreur lors de la création de la tâche");
    }
    setSavingTask(false);
  }

  async function updateTaskStatus(task: Task, status: "TODO" | "IN_PROGRESS" | "DONE") {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const updatedTask = { ...task, status };
      if (task.projectId === null) {
        setStandaloneTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      } else {
        setProjects(prev => prev.map(p =>
          p.id === task.projectId
            ? { ...p, tasks: p.tasks.map(t => t.id === task.id ? updatedTask : t) }
            : p
        ));
      }
    } catch {
      alert("Erreur");
    }
  }

  async function deleteTask(task: Task) {
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (task.projectId === null) {
        setStandaloneTasks(prev => prev.filter(t => t.id !== task.id));
      } else {
        setProjects(prev => prev.map(p =>
          p.id === task.projectId
            ? { ...p, tasks: p.tasks.filter(t => t.id !== task.id) }
            : p
        ));
      }
    } catch {
      alert("Erreur lors de la suppression");
    }
  }

  async function saveEditTask() {
    if (!editingTask || !editTaskTitle.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskTitle,
          description: editTaskDesc,
          priority: editTaskPriority,
          dueDate: editTaskDue || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated: Task = await res.json();

      if (updated.projectId === null) {
        setStandaloneTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      } else {
        setProjects(prev => prev.map(p =>
          p.id === updated.projectId
            ? { ...p, tasks: p.tasks.map(t => t.id === updated.id ? { ...t, ...updated } : t) }
            : p
        ));
      }
      setEditingTask(null);
    } catch {
      alert("Erreur lors de la modification");
    }
  }

  async function addQuickTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodo.trim()) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTodo, projectId: null, status: "TODO" }),
      });
      if (!res.ok) throw new Error();
      const task: Task = await res.json();
      setStandaloneTasks(prev => [...prev, task]);
      setNewTodo("");
      todoInputRef.current?.focus();
    } catch {
      alert("Erreur");
    }
  }

  async function toggleTodo(task: Task) {
    const newStatus = task.status === "DONE" ? "TODO" : "DONE";
    await updateTaskStatus(task, newStatus);
  }

  const selectedProject = selectedProjectId === "__todos__"
    ? null
    : projects.find(p => p.id === selectedProjectId);

  const currentTasks = selectedProject ? selectedProject.tasks : standaloneTasks;

  function getTasksByStatus(status: string) {
    return currentTasks.filter(t => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  const totalTasks = projects.reduce((acc, p) => acc + p.tasks.length, 0) + standaloneTasks.length;
  const doneTasks = projects.reduce((acc, p) => acc + p.tasks.filter(t => t.status === "DONE").length, 0)
    + standaloneTasks.filter(t => t.status === "DONE").length;

  // Fetch standalone tasks on mount
  useEffect(() => {
    async function loadStandalone() {
      // We'll use a workaround: tasks with null projectId
      // Since our GET /api/projects only returns project tasks,
      // we'll store standalone tasks separately
    }
    loadStandalone();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f7]">
      {/* Left sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Projets</h1>
            <button
              onClick={() => setShowNewProject(true)}
              className="h-8 w-8 rounded-lg bg-[#0071e3] text-white flex items-center justify-center hover:bg-[#0077ed] transition-colors"
              title="Nouveau projet"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-[#f5f5f7] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{totalTasks}</p>
              <p className="text-xs text-gray-500">Tâches</p>
            </div>
            <div className="flex-1 bg-[#f5f5f7] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-600">{doneTasks}</p>
              <p className="text-xs text-gray-500">Terminées</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* To-do list */}
          <button
            onClick={() => setSelectedProjectId("__todos__")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              selectedProjectId === "__todos__"
                ? "bg-[#0071e3]/10 text-[#0071e3]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedProjectId === "__todos__" ? "bg-[#0071e3]" : "bg-gray-200"
            }`}>
              <svg className={`h-4 w-4 ${selectedProjectId === "__todos__" ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <span>Mes tâches</span>
            {standaloneTasks.filter(t => t.status !== "DONE").length > 0 && (
              <span className="ml-auto text-xs bg-[#0071e3] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {standaloneTasks.filter(t => t.status !== "DONE").length}
              </span>
            )}
          </button>

          {/* Separator */}
          {projects.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
              Projets
            </p>
          )}

          {/* Project list */}
          {loading ? (
            <div className="px-3 py-4 text-sm text-gray-400">Chargement...</div>
          ) : (
            projects.map(project => {
              const pending = project.tasks.filter(t => t.status !== "DONE").length;
              const isActive = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left group ${
                    isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <div
                    className="h-7 w-7 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: project.color + "20", border: `2px solid ${project.color}40` }}
                  >
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                    </div>
                  </div>
                  <span className="truncate flex-1">{project.title}</span>
                  {pending > 0 && (
                    <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {pending}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {selectedProject ? (
              <>
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: selectedProject.color + "20" }}
                >
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedProject.title}</h2>
                  {selectedProject.description && (
                    <p className="text-xs text-gray-500">{selectedProject.description}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="h-9 w-9 rounded-xl bg-[#0071e3]/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-[#0071e3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Mes tâches</h2>
                  <p className="text-xs text-gray-500">Tâches rapides et to-do list</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedProject && (
              <>
                <button
                  onClick={() => {
                    setEditingProject(selectedProject);
                    setEditProjectTitle(selectedProject.title);
                    setEditProjectDesc(selectedProject.description);
                    setEditProjectColor(selectedProject.color);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => deleteProject(selectedProject.id)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Supprimer
                </button>
              </>
            )}
            <button
              onClick={() => {
                setNewTaskStatus("TODO");
                setShowNewTask(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {selectedProjectId === "__todos__" ? (
            /* TO-DO LIST VIEW */
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Quick add */}
              <form onSubmit={addQuickTodo} className="flex gap-3">
                <input
                  ref={todoInputRef}
                  value={newTodo}
                  onChange={e => setNewTodo(e.target.value)}
                  placeholder="Ajouter une tâche rapide..."
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] transition-colors"
                >
                  Ajouter
                </button>
              </form>

              {/* Todo items */}
              {standaloneTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <svg className="h-12 w-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="font-medium">Aucune tâche</p>
                  <p className="text-sm mt-1">Ajoutez votre première tâche ci-dessus</p>
                </div>
              ) : (
                <>
                  {/* Pending */}
                  {standaloneTasks.filter(t => t.status !== "DONE").length > 0 && (
                    <div className="space-y-2">
                      {standaloneTasks.filter(t => t.status !== "DONE").map(task => (
                        <TodoItem
                          key={task.id}
                          task={task}
                          onToggle={() => toggleTodo(task)}
                          onDelete={() => deleteTask(task)}
                          onEdit={() => {
                            setEditingTask(task);
                            setEditTaskTitle(task.title);
                            setEditTaskDesc(task.description);
                            setEditTaskPriority(task.priority as "LOW" | "NORMAL" | "HIGH");
                            setEditTaskDue(task.dueDate ? task.dueDate.slice(0, 10) : "");
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Done */}
                  {standaloneTasks.filter(t => t.status === "DONE").length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
                        Terminées ({standaloneTasks.filter(t => t.status === "DONE").length})
                      </p>
                      <div className="space-y-2">
                        {standaloneTasks.filter(t => t.status === "DONE").map(task => (
                          <TodoItem
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTodo(task)}
                            onDelete={() => deleteTask(task)}
                            onEdit={() => {
                              setEditingTask(task);
                              setEditTaskTitle(task.title);
                              setEditTaskDesc(task.description);
                              setEditTaskPriority(task.priority as "LOW" | "NORMAL" | "HIGH");
                              setEditTaskDue(task.dueDate ? task.dueDate.slice(0, 10) : "");
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* KANBAN VIEW */
            <div className="flex gap-5 h-full">
              {COLUMNS.map(col => {
                const tasks = getTasksByStatus(col.key);
                return (
                  <div key={col.key} className="flex-1 min-w-0 flex flex-col">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg ${col.bg} ${col.color}`}>
                        {col.label}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{tasks.length}</span>
                      <button
                        onClick={() => {
                          setNewTaskStatus(col.key as "TODO" | "IN_PROGRESS" | "DONE");
                          setShowNewTask(true);
                        }}
                        className="ml-auto h-6 w-6 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        title="Ajouter une tâche"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Tasks */}
                    <div className="flex-1 space-y-3 overflow-y-auto">
                      {tasks.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                          <p className="text-xs text-gray-400">Aucune tâche</p>
                        </div>
                      )}
                      {tasks.map(task => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          onStatusChange={(status) => updateTaskStatus(task, status)}
                          onDelete={() => deleteTask(task)}
                          onEdit={() => {
                            setEditingTask(task);
                            setEditTaskTitle(task.title);
                            setEditTaskDesc(task.description);
                            setEditTaskPriority(task.priority as "LOW" | "NORMAL" | "HIGH");
                            setEditTaskDue(task.dueDate ? task.dueDate.slice(0, 10) : "");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* === MODALS === */}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Nouveau projet</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom du projet</label>
                <input
                  autoFocus
                  value={newProjectTitle}
                  onChange={e => setNewProjectTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createProject()}
                  placeholder="Ex: Refonte site web..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optionnel)</label>
                <textarea
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  placeholder="Objectifs du projet..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${newProjectColor === color ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowNewProject(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Annuler
              </button>
              <button
                onClick={createProject}
                disabled={savingProject || !newProjectTitle.trim()}
                className="px-5 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
              >
                {savingProject ? "Création..." : "Créer le projet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Modifier le projet</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                <input
                  autoFocus
                  value={editProjectTitle}
                  onChange={e => setEditProjectTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={editProjectDesc}
                  onChange={e => setEditProjectDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setEditProjectColor(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${editProjectColor === color ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditingProject(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Annuler
              </button>
              <button
                onClick={saveEditProject}
                disabled={!editProjectTitle.trim()}
                className="px-5 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Nouvelle tâche</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre</label>
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createTask()}
                  placeholder="Description de la tâche..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optionnel)</label>
                <textarea
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder="Détails supplémentaires..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Statut</label>
                  <select
                    value={newTaskStatus}
                    onChange={e => setNewTaskStatus(e.target.value as "TODO" | "IN_PROGRESS" | "DONE")}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white"
                  >
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as "LOW" | "NORMAL" | "HIGH")}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date limite (optionnel)</label>
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={e => setNewTaskDue(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowNewTask(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Annuler
              </button>
              <button
                onClick={createTask}
                disabled={savingTask || !newTaskTitle.trim()}
                className="px-5 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
              >
                {savingTask ? "Création..." : "Créer la tâche"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Modifier la tâche</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre</label>
                <input
                  autoFocus
                  value={editTaskTitle}
                  onChange={e => setEditTaskTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={editTaskDesc}
                  onChange={e => setEditTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité</label>
                  <select
                    value={editTaskPriority}
                    onChange={e => setEditTaskPriority(e.target.value as "LOW" | "NORMAL" | "HIGH")}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] bg-white"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date limite</label>
                  <input
                    type="date"
                    value={editTaskDue}
                    onChange={e => setEditTaskDue(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Annuler
              </button>
              <button
                onClick={saveEditTask}
                disabled={!editTaskTitle.trim()}
                className="px-5 py-2 bg-[#0071e3] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-50 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== SUB-COMPONENTS ===== */

function TodoItem({
  task,
  onToggle,
  onDelete,
  onEdit,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const isDone = task.status === "DONE";
  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date();

  return (
    <div className={`flex items-start gap-3 p-3.5 bg-white rounded-xl border transition-all group ${
      isDone ? "border-gray-100 opacity-60" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
    }`}>
      <button
        onClick={onToggle}
        className={`mt-0.5 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isDone ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-[#0071e3]"
        }`}
      >
        {isDone && (
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>
        )}
        {task.dueDate && (
          <p className={`text-xs mt-1 ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "⚠️ " : "📅 "}
            {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  task: Task;
  onStatusChange: (status: "TODO" | "IN_PROGRESS" | "DONE") => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all group relative">
      {/* Priority badge */}
      {task.priority !== "NORMAL" && (
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-lg mb-2 ${PRIORITY_COLORS[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      )}

      <p className={`text-sm font-medium text-gray-900 ${task.status === "DONE" ? "line-through text-gray-400" : ""}`}>
        {task.title}
      </p>

      {task.description && (
        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        {task.dueDate ? (
          <span className={`text-xs ${isOverdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
            {isOverdue ? "⚠️ " : "📅 "}
            {new Date(task.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        ) : <span />}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Move buttons */}
          {task.status !== "TODO" && (
            <button
              onClick={() => onStatusChange(task.status === "DONE" ? "IN_PROGRESS" : "TODO")}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reculer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {task.status !== "DONE" && (
            <button
              onClick={() => onStatusChange(task.status === "TODO" ? "IN_PROGRESS" : "DONE")}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Avancer"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
