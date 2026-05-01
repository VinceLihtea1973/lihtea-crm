"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { completeTaskAction, createTaskAction } from "@/app/_actions/tasks";

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueAt: string | null;
  company: { id: string; name: string } | null;
  contact: { firstName: string | null; lastName: string } | null;
  deal: { id: string; name: string } | null;
  assignee: { name: string | null; email: string | null } | null;
};

const PRIORITY_META: Record<Priority, { label: string; color: "navy" | "teal" | "gold" | "red"; dot: string }> = {
  LOW:    { label: "Basse",   color: "navy", dot: "bg-text-3" },
  NORMAL: { label: "Normale", color: "teal", dot: "bg-teal"   },
  HIGH:   { label: "Haute",   color: "gold", dot: "bg-amber-500" },
  URGENT: { label: "Urgente", color: "red",  dot: "bg-red-500"   },
};

function fmtDue(iso: string | null) {
  if (!iso) return { label: "—", urgent: false };
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(iso); due.setHours(0,0,0,0);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { label: `Retard ${-diff}j`, urgent: true };
  if (diff === 0) return { label: "Aujourd'hui",      urgent: true };
  if (diff === 1) return { label: "Demain",           urgent: false };
  if (diff < 7)   return { label: `Dans ${diff}j`,   urgent: false };
  return { label: new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), urgent: false };
}

export function TachesClient({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter();
  const [tasks, setTasks]           = useState<Task[]>(initialTasks);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter]         = useState<Priority | "ALL">("ALL");
  const [isPending, start]          = useTransition();

  const counts = {
    urgent: tasks.filter((t) => t.priority === "URGENT").length,
    high:   tasks.filter((t) => t.priority === "HIGH").length,
    all:    tasks.length,
  };

  async function handleComplete(taskId: string) {
    setCompleting(taskId);
    const r = await completeTaskAction(taskId);
    if (r.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
    setCompleting(null);
  }

  const filtered = filter === "ALL" ? tasks : tasks.filter((t) => t.priority === filter);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilter("ALL")}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${filter === "ALL" ? "bg-navy text-white border-navy" : "bg-surface border-border text-text-2 hover:bg-bg"}`}>
            Toutes ({counts.all})
          </button>
          {counts.urgent > 0 && (
            <button onClick={() => setFilter("URGENT")}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${filter === "URGENT" ? "bg-red-500 text-white border-red-500" : "bg-surface border-border text-text-2 hover:bg-bg"}`}>
              Urgentes ({counts.urgent})
            </button>
          )}
          {counts.high > 0 && (
            <button onClick={() => setFilter("HIGH")}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${filter === "HIGH" ? "bg-amber-500 text-white border-amber-500" : "bg-surface border-border text-text-2 hover:bg-bg"}`}>
              Hautes ({counts.high})
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal text-white rounded-lg text-[13px] font-bold hover:bg-teal/80 transition-colors shadow-sm"
        >
          + Nouvelle tâche
        </button>
      </div>

      {/* List */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-[13px] text-text-3">
            {tasks.length === 0 ? "Aucune tâche ouverte 🎉" : "Aucune tâche dans ce filtre"}
          </div>
        )}
        <ul>
          {filtered.map((t) => {
            const meta = PRIORITY_META[t.priority];
            const due  = fmtDue(t.dueAt);
            const contactName = t.contact
              ? `${t.contact.firstName ?? ""} ${t.contact.lastName}`.trim()
              : null;
            const isCompleting = completing === t.id;
            return (
              <li key={t.id}
                className={`px-5 py-4 border-b border-border last:border-0 flex items-start gap-4 transition-opacity ${isCompleting ? "opacity-40" : "hover:bg-bg/40"}`}>
                <button
                  onClick={() => handleComplete(t.id)}
                  disabled={!!completing}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-border hover:border-teal flex items-center justify-center shrink-0 transition-colors"
                >
                  {isCompleting && (
                    <svg className="w-3 h-3 text-teal animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-text-1">{t.title}</span>
                    <Chip color={meta.color}>{meta.label}</Chip>
                  </div>
                  {t.description && (
                    <p className="mt-0.5 text-[12px] text-text-2 line-clamp-1">{t.description}</p>
                  )}
                  <div className="mt-1 text-[11px] text-text-3 flex items-center gap-2 flex-wrap">
                    {t.company && <span className="font-semibold text-navy">{t.company.name}</span>}
                    {contactName && <span>· {contactName}</span>}
                    {t.deal && <span>· {t.deal.name}</span>}
                  </div>
                </div>

                <div className={`text-[11px] font-bold shrink-0 ${due.urgent ? "text-red-500" : "text-text-3"}`}>
                  {due.label}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Modal création */}
      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Modal création tâche ─────────────────────────────────────────

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);
  const [form, setForm]    = useState({
    title: "", description: "", priority: "NORMAL", dueAt: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createTaskAction({
        title:       form.title,
        description: form.description || undefined,
        priority:    form.priority as Priority,
        dueAt:       form.dueAt ? new Date(form.dueAt) : undefined,
      });
      if (!r.ok) { setError(r.error); return; }
      onCreated();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="text-[15px] font-extrabold text-navy">Nouvelle tâche</div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Titre</label>
            <input name="title" value={form.title} onChange={handleChange} required autoFocus
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1"
              placeholder="Ex : Rappeler le directeur commercial…" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Description (optionnel)</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2}
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Priorité</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1">
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Échéance</label>
              <input name="dueAt" type="date" value={form.dueAt} onChange={handleChange}
                className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1" />
            </div>
          </div>
          {error && <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-[13px] font-semibold text-text-2 border border-border rounded-lg hover:bg-bg transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-[13px] font-bold text-white bg-teal rounded-lg hover:bg-teal/80 transition-colors disabled:opacity-60">
              {isPending ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
