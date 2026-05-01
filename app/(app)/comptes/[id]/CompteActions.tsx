"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateCompanyStatusAction } from "@/app/_actions/companies";
import { createDealAction } from "@/app/_actions/deals";
import { enrichCompanyFromPappersAction } from "@/app/_actions/pappers";
import { addActivityAction } from "@/app/_actions/activities";
import { createTaskAction } from "@/app/_actions/tasks";

type Status = "PROSPECT" | "LEAD" | "CLIENT" | "LOST";

const STATUS_SEQUENCE: Status[] = ["PROSPECT", "LEAD", "CLIENT", "LOST"];
const STATUS_LABELS: Record<Status, string> = {
  PROSPECT: "Prospect",
  LEAD:     "Lead",
  CLIENT:   "Client",
  LOST:     "Perdu",
};

export function CompteActions({
  companyId,
  currentStatus,
  companyName,
}: {
  companyId: string;
  currentStatus: string;
  companyName: string;
}) {
  const router  = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDealModal,     setShowDealModal]     = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showTaskModal,     setShowTaskModal]     = useState(false);
  const [statusMenuOpen,    setStatusMenuOpen]    = useState(false);

  const nextStatus = STATUS_SEQUENCE[
    STATUS_SEQUENCE.indexOf(currentStatus as Status) + 1
  ] as Status | undefined;

  function handleStatusChange(status: Status) {
    setStatusMenuOpen(false);
    startTransition(async () => {
      await updateCompanyStatusAction(companyId, status);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Status change */}
        <div className="relative">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => setStatusMenuOpen((v) => !v)}
          >
            Statut ▾
          </Button>
          {statusMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStatusMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {STATUS_SEQUENCE.map((s) => (
                  <button
                    key={s}
                    disabled={s === currentStatus}
                    onClick={() => handleStatusChange(s)}
                    className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-bg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Enrichir via Pappers */}
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await enrichCompanyFromPappersAction({ companyId });
              router.refresh();
            });
          }}
        >
          ✦ Enrichir Pappers
        </Button>

        {/* Log activité */}
        <Button variant="secondary" onClick={() => setShowActivityModal(true)} disabled={isPending}>
          📝 Log activité
        </Button>

        {/* Nouvelle tâche */}
        <Button variant="secondary" onClick={() => setShowTaskModal(true)} disabled={isPending}>
          ✓ Tâche
        </Button>

        {/* New deal button */}
        <Button onClick={() => setShowDealModal(true)} disabled={isPending}>
          + Nouveau deal
        </Button>
      </div>

      {showDealModal && (
        <CreateDealModal
          companyId={companyId}
          companyName={companyName}
          onClose={() => setShowDealModal(false)}
          onCreated={() => { setShowDealModal(false); router.refresh(); }}
        />
      )}
      {showActivityModal && (
        <LogActivityModal
          companyId={companyId}
          onClose={() => setShowActivityModal(false)}
          onCreated={() => { setShowActivityModal(false); router.refresh(); }}
        />
      )}
      {showTaskModal && (
        <CreateTaskModal
          companyId={companyId}
          onClose={() => setShowTaskModal(false)}
          onCreated={() => { setShowTaskModal(false); router.refresh(); }}
        />
      )}
    </>
  );
}

// ─── Create Deal Modal ───────────────────────────────────────────────────────

function CreateDealModal({
  companyId,
  companyName,
  onClose,
  onCreated,
}: {
  companyId: string;
  companyName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:            `Deal ${companyName}`,
    amount:          "",
    stage:           "QUALIFICATION",
    expectedCloseAt: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDealAction({
        name:            form.name,
        companyId,
        amount:          Number(form.amount) || 0,
        stage:           form.stage as never,
        expectedCloseAt: form.expectedCloseAt ? new Date(form.expectedCloseAt) : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="text-[15px] font-extrabold text-navy">Nouveau deal</div>
          <button
            onClick={onClose}
            className="text-text-3 hover:text-text-1 transition-colors text-[20px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">
              Nom du deal
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">
                Montant (€)
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                value={form.amount}
                onChange={handleChange}
                placeholder="0"
                className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">
                Stage
              </label>
              <select
                name="stage"
                value={form.stage}
                onChange={handleChange}
                className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1"
              >
                <option value="QUALIFICATION">Qualification</option>
                <option value="DEMO">Démo</option>
                <option value="PROPOSAL">Proposition</option>
                <option value="NEGOTIATION">Négociation</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">
              Date de clôture prévue
            </label>
            <input
              name="expectedCloseAt"
              type="date"
              value={form.expectedCloseAt}
              onChange={handleChange}
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1"
            />
          </div>

          {error && (
            <p className="text-[12px] text-lh-red bg-lh-red-bg px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Création…" : "Créer le deal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Log Activity Modal ──────────────────────────────────────────────────────

function LogActivityModal({
  companyId, onClose, onCreated,
}: { companyId: string; onClose: () => void; onCreated: () => void }) {
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);
  const [form, setForm]    = useState({ type: "NOTE", subject: "", body: "" });

  const TYPES = [
    { value: "NOTE",      label: "📝 Note" },
    { value: "CALL",      label: "📞 Appel" },
    { value: "MEETING",   label: "🤝 RDV" },
    { value: "EMAIL_OUT", label: "📤 Email envoyé" },
    { value: "EMAIL_IN",  label: "📥 Email reçu" },
  ];

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await addActivityAction({ type: form.type as never, subject: form.subject, body: form.body || undefined, companyId });
      if (!r.ok) { setError(r.error); return; }
      onCreated();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="text-[15px] font-extrabold text-navy">Logger une activité</div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 text-[20px] leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                    form.type === t.value ? "bg-teal text-white border-teal" : "bg-bg border-border text-text-2 hover:border-teal/40"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Sujet</label>
            <input name="subject" value={form.subject} onChange={handleChange} required autoFocus
              placeholder="Ex : Appel de découverte avec le DG…"
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-3 uppercase tracking-wider mb-1.5">Notes (optionnel)</label>
            <textarea name="body" value={form.body} onChange={handleChange} rows={3}
              placeholder="Détails, points clés, prochaines étapes…"
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1 resize-none" />
          </div>
          {error && <p className="text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Task Modal ───────────────────────────────────────────────────────

function CreateTaskModal({
  companyId, onClose, onCreated,
}: { companyId: string; onClose: () => void; onCreated: () => void }) {
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);
  const [form, setForm]    = useState({ title: "", priority: "NORMAL", dueAt: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createTaskAction({
        title: form.title,
        priority: form.priority as never,
        dueAt: form.dueAt ? new Date(form.dueAt) : undefined,
        companyId,
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
              placeholder="Ex : Envoyer proposition commerciale…"
              className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-text-1" />
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
            <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Création…" : "Créer"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
