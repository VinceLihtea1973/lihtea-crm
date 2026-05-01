"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import {
  updateSequenceAction,
  addSequenceStepAction,
  updateSequenceStepAction,
  deleteSequenceStepAction,
  enrollContactAction,
  unenrollContactAction,
} from "@/app/_actions/sequences";
import { sendNextSequenceStepAction, checkRepliesAction } from "@/app/_actions/gmail";

// ─── Types ────────────────────────────────────────────────────────

type Step = {
  id: string; order: number; type: string;
  delayDays: number; subject: string; bodyMarkdown: string;
};
type EnrStatus = "ACTIVE"|"PAUSED"|"COMPLETED"|"REPLIED"|"BOUNCED"|"UNSUBSCRIBED"|"REMOVED";
type Enrollment = {
  id: string; status: EnrStatus; currentStepOrder: number;
  nextSendAt: string|null; completedAt: string|null; lastSentAt: string|null;
  contact: { id:string; firstName:string; lastName:string; email:string; companyId:string|null };
};
type Contact = { id:string; firstName:string; lastName:string; email:string; companyId:string|null };
type SeqData = {
  id:string; name:string; description:string|null;
  status:"DRAFT"|"ACTIVE"|"PAUSED"|"ARCHIVED"; fromName:string|null;
  steps:Step[]; enrollments:Enrollment[];
  gmailEmail:string|null; availableContacts:Contact[];
};

// ─── Helpers ──────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const days = Math.round(absDiff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (diff < 0)  return `Il y a ${days}j`;
  if (days === 1) return "Demain";
  return `Dans ${days}j`;
}

const ENR_STATUS_CONFIG: Record<EnrStatus, { label: string; dot: string; text: string }> = {
  ACTIVE:       { label: "En cours",   dot: "bg-teal",        text: "text-teal" },
  PAUSED:       { label: "Pausé",      dot: "bg-slate-400",   text: "text-slate-500" },
  COMPLETED:    { label: "Terminé",    dot: "bg-navy/60",     text: "text-navy" },
  REPLIED:      { label: "Répondu",    dot: "bg-purple-500",  text: "text-purple-600" },
  BOUNCED:      { label: "Bounce",     dot: "bg-lh-red",      text: "text-lh-red" },
  UNSUBSCRIBED: { label: "Désinscrit", dot: "bg-gray-300",    text: "text-gray-400" },
  REMOVED:      { label: "Retiré",     dot: "bg-gray-300",    text: "text-gray-400" },
};

const SEQ_STATUS_LABEL = { DRAFT:"Brouillon", ACTIVE:"Active", PAUSED:"Pausée", ARCHIVED:"Archivée" };

// ─── Main ─────────────────────────────────────────────────────────

export function SequenceEditor({ sequence }: { sequence: SeqData }) {
  const router = useRouter();
  const [mode, setMode]              = useState<"build"|"run">("build");
  const [selectedStepId, setStep]    = useState<string|null>(sequence.steps[0]?.id ?? null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [showEnroll, setShowEnroll]   = useState(false);
  const [statusPending, startStatus]  = useTransition();

  const activeEnrollments = sequence.enrollments.filter(e => e.status !== "REMOVED");
  const selectedStep = sequence.steps.find(s => s.id === selectedStepId) ?? null;

  function handleStatusChange(status: SeqData["status"]) {
    startStatus(async () => {
      await updateSequenceAction({ sequenceId: sequence.id, status });
      router.refresh();
    });
  }

  const stats = {
    total:     activeEnrollments.length,
    active:    activeEnrollments.filter(e => e.status === "ACTIVE").length,
    completed: activeEnrollments.filter(e => e.status === "COMPLETED").length,
    replied:   activeEnrollments.filter(e => e.status === "REPLIED").length,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex-none px-6 py-3 bg-surface border-b border-border flex items-center gap-4 flex-wrap">

        {/* Gmail badge */}
        {sequence.gmailEmail ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal/10 border border-teal/20 rounded-lg text-[11px] font-semibold text-teal flex-none">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            {sequence.gmailEmail}
          </div>
        ) : (
          <a href="/parametres" className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-700 hover:bg-amber-100 flex-none">
            ⚠ Connecter Gmail
          </a>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4">
          <StatChip label="Étapes"    value={sequence.steps.length} />
          <StatChip label="En cours"  value={stats.active}     color="text-teal" />
          <StatChip label="Terminés"  value={stats.completed}  />
          <StatChip label="Réponses"  value={stats.replied}    color="text-purple-600" />
        </div>

        <div className="flex-1" />

        {/* Status buttons */}
        <div className="flex items-center gap-1 flex-none">
          {(["DRAFT","ACTIVE","PAUSED","ARCHIVED"] as const).map(s => (
            <button
              key={s}
              disabled={statusPending || sequence.status === s}
              onClick={() => handleStatusChange(s)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                sequence.status === s
                  ? s === "ACTIVE"   ? "bg-teal/10 border-teal/30 text-teal"
                  : s === "DRAFT"    ? "bg-amber-50 border-amber-200 text-amber-700"
                  : s === "PAUSED"   ? "bg-slate-100 border-slate-200 text-slate-500"
                  :                   "bg-gray-50 border-gray-200 text-gray-400"
                  : "border-border text-text-3 hover:bg-bg"
              } disabled:cursor-default`}
            >
              {SEQ_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mode toggle ─────────────────────────────────────────── */}
      <div className="flex-none px-6 border-b border-border bg-bg flex items-center gap-1">
        {[
          { key: "build", label: "Construire", icon: "✏" },
          { key: "run",   label: `Piloter (${stats.total})`, icon: "▶" },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key as "build"|"run")}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
              mode === m.key
                ? "border-navy text-navy"
                : "border-transparent text-text-3 hover:text-text-1"
            }`}
          >
            <span className="text-[12px]">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* ── Build mode ──────────────────────────────────────────── */}
      {mode === "build" && (
        <div className="flex-1 flex overflow-hidden">

          {/* Left: Step timeline */}
          <div className="w-64 flex-none border-r border-border bg-bg flex flex-col">
            <div className="flex-none px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-3">Flux d'envoi</span>
              <button
                onClick={() => { setShowAddStep(true); setStep(null); }}
                className="text-[11px] font-bold text-teal hover:text-teal/70 flex items-center gap-1"
              >
                + Étape
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              {sequence.steps.length === 0 && (
                <div className="py-10 text-center text-[12px] text-text-3 leading-relaxed">
                  Aucune étape.<br />
                  <button onClick={() => setShowAddStep(true)} className="text-teal font-semibold mt-1 hover:underline">
                    Ajouter le premier email
                  </button>
                </div>
              )}

              {sequence.steps.map((step, idx) => (
                <div key={step.id}>
                  {/* Delay connector */}
                  {idx > 0 && (
                    <div className="flex flex-col items-center py-0.5 gap-0.5">
                      <div className="w-px h-3 bg-border" />
                      <span className="text-[9px] text-text-3 font-bold px-2 py-0.5 bg-bg border border-border rounded-full">
                        {step.delayDays === 0 ? "Immédiat" : `+ ${step.delayDays}j`}
                      </span>
                      <div className="w-px h-3 bg-border" />
                    </div>
                  )}

                  <button
                    onClick={() => { setStep(step.id); setShowAddStep(false); }}
                    className={`w-full text-left rounded-xl border p-3 transition-all group ${
                      selectedStepId === step.id && !showAddStep
                        ? "border-navy/30 bg-navy/5 shadow-sm"
                        : "border-border bg-surface hover:border-navy/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-5 h-5 rounded-full grid place-items-center text-[9px] font-black flex-none ${
                        selectedStepId === step.id && !showAddStep
                          ? "bg-navy text-white"
                          : "bg-navy/10 text-navy"
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-[9px] text-text-3 font-bold uppercase tracking-wide">
                        {idx === 0 ? "Email initial" : `Relance ${idx}`}
                      </span>
                    </div>
                    <div className="text-[12px] font-semibold text-text-1 truncate pl-7 leading-tight">
                      {step.subject || <em className="text-text-3 font-normal">Sans sujet</em>}
                    </div>
                    {step.bodyMarkdown && (
                      <div className="text-[10px] text-text-3 truncate pl-7 mt-0.5">
                        {step.bodyMarkdown.split("\n")[0]}
                      </div>
                    )}
                  </button>
                </div>
              ))}

              {/* Add step CTA */}
              {sequence.steps.length > 0 && (
                <div>
                  <div className="flex flex-col items-center py-0.5">
                    <div className="w-px h-4 bg-border" />
                  </div>
                  <button
                    onClick={() => { setShowAddStep(true); setStep(null); }}
                    className={`w-full py-2.5 rounded-xl border-2 border-dashed text-[11px] font-semibold transition-all ${
                      showAddStep
                        ? "border-navy/40 bg-navy/5 text-navy"
                        : "border-border text-text-3 hover:border-navy/30 hover:text-navy"
                    }`}
                  >
                    + Relance suivante
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Step editor */}
          <div className="flex-1 overflow-y-auto">
            {showAddStep ? (
              <div className="p-6 max-w-2xl">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-[15px] font-bold text-navy">Nouvelle étape email</div>
                    <div className="text-[12px] text-text-3 mt-0.5">Étape {sequence.steps.length + 1}</div>
                  </div>
                  <button onClick={() => setShowAddStep(false)} className="text-text-3 hover:text-text-1 w-8 h-8 grid place-items-center rounded-lg hover:bg-bg text-[16px]">✕</button>
                </div>
                <AddStepForm
                  sequenceId={sequence.id}
                  isFirst={sequence.steps.length === 0}
                  onCancel={() => setShowAddStep(false)}
                  onSaved={(id) => { setShowAddStep(false); setStep(id); router.refresh(); }}
                />
              </div>
            ) : selectedStep ? (
              <div className="p-6 max-w-2xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 rounded-full bg-navy grid place-items-center text-[11px] font-black text-white flex-none">
                    {sequence.steps.findIndex(s => s.id === selectedStep.id) + 1}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-navy">
                      {selectedStep.order === 0 ? "Email initial" : `Relance ${selectedStep.order}`}
                    </div>
                    <div className="text-[12px] text-text-3">
                      {selectedStep.order === 0 ? "Envoi immédiat à l'inscription" : `Envoyé ${selectedStep.delayDays}j après l'étape précédente`}
                    </div>
                  </div>
                </div>
                <EditStepForm
                  key={selectedStep.id}
                  step={selectedStep}
                  isFirst={selectedStep.order === 0}
                  onSaved={() => router.refresh()}
                  onDeleted={() => {
                    setStep(sequence.steps.find(s => s.id !== selectedStep.id)?.id ?? null);
                    router.refresh();
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-navy/5 border border-border grid place-items-center text-[22px] mb-3">✉</div>
                <div className="text-[14px] font-semibold text-text-1 mb-1">Sélectionnez une étape</div>
                <div className="text-[12px] text-text-3 mb-5 max-w-xs">
                  Cliquez sur une étape dans le flux à gauche pour l'éditer.
                </div>
                <button
                  onClick={() => setShowAddStep(true)}
                  className="px-4 py-2 bg-navy text-white rounded-lg text-[12px] font-bold hover:bg-navy/80"
                >
                  + Créer le premier email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Run mode (Piloter) ───────────────────────────────────── */}
      {mode === "run" && (
        <PilotView
          sequence={sequence}
          enrollments={activeEnrollments}
          onAction={() => router.refresh()}
          onEnroll={() => setShowEnroll(true)}
        />
      )}

      {/* Enroll modal */}
      {showEnroll && (
        <EnrollModal
          sequenceId={sequence.id}
          contacts={sequence.availableContacts}
          onClose={() => setShowEnroll(false)}
          onEnrolled={() => { setShowEnroll(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[14px] font-black ${color ?? "text-text-1"}`}>{value}</span>
      <span className="text-[11px] text-text-3 font-medium">{label}</span>
    </div>
  );
}

// ─── Pilot view ───────────────────────────────────────────────────

function PilotView({ sequence, enrollments, onAction, onEnroll }: {
  sequence: SeqData; enrollments: Enrollment[]; onAction: ()=>void; onEnroll: ()=>void;
}) {
  const [filter, setFilter] = useState<"all"|"active"|"replied"|"completed">("all");
  const [query, setQuery]   = useState("");

  const filtered = enrollments.filter(e => {
    const matchFilter = filter === "all" || e.status.toLowerCase() === filter;
    const name = `${e.contact.firstName} ${e.contact.lastName} ${e.contact.email}`.toLowerCase();
    return matchFilter && name.includes(query.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-none px-6 py-3 border-b border-border bg-bg flex items-center gap-3 flex-wrap">
        {/* Filter pills */}
        <div className="flex items-center gap-1">
          {(["all","active","replied","completed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                filter === f
                  ? "bg-navy text-white"
                  : "bg-bg border border-border text-text-3 hover:text-text-1"
              }`}
            >
              {f === "all" ? "Tous" : f === "active" ? "En cours" : f === "replied" ? "Réponses" : "Terminés"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un contact…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-[12px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-teal/50 transition-all"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-text-3">🔍</span>
        </div>

        <div className="flex-1" />

        {/* Enroll CTA */}
        <button
          onClick={onEnroll}
          disabled={sequence.steps.length === 0 || sequence.availableContacts.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-navy text-white rounded-lg text-[12px] font-bold hover:bg-navy/80 transition-colors disabled:opacity-40"
        >
          + Inscrire des contacts
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {enrollments.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-navy/5 border border-border grid place-items-center text-[22px] mb-3">👥</div>
                <div className="text-[14px] font-semibold text-text-1 mb-1">Aucun contact inscrit</div>
                <div className="text-[12px] text-text-3 mb-4 max-w-xs">
                  Inscrivez des contacts pour lancer la séquence.
                  {sequence.steps.length === 0 && (
                    <span className="block mt-2 text-amber-600 font-semibold">
                      ⚠ Ajoutez d'abord des étapes dans "Construire".
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-[14px] font-semibold text-text-1 mb-1">Aucun résultat</div>
                <div className="text-[12px] text-text-3">Modifiez le filtre ou la recherche.</div>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
                <th className="text-left px-6 py-3">Contact</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-left px-4 py-3">Progression</th>
                <th className="text-left px-4 py-3">Prochain envoi</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(enr => (
                <EnrollmentRow
                  key={enr.id}
                  enr={enr}
                  totalSteps={sequence.steps.length}
                  gmailConnected={!!sequence.gmailEmail}
                  onAction={onAction}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Enrollment row ───────────────────────────────────────────────

function EnrollmentRow({ enr, totalSteps, gmailConnected, onAction }: {
  enr: Enrollment; totalSteps: number; gmailConnected: boolean; onAction: ()=>void;
}) {
  const [sending, setSending]     = useState(false);
  const [checking, setChecking]   = useState(false);
  const [feedback, setFeedback]   = useState<{type:"ok"|"err"|"info"; msg:string} | null>(null);
  const [uenrPending, startUenr]  = useTransition();

  const cfg = ENR_STATUS_CONFIG[enr.status];

  function showFb(type: "ok"|"err"|"info", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleSend() {
    setSending(true);
    const res = await sendNextSequenceStepAction(enr.id);
    if (res.ok) { showFb("ok", "Email envoyé"); onAction(); }
    else        { showFb("err", res.error); }
    setSending(false);
  }

  async function handleCheck() {
    setChecking(true);
    const res = await checkRepliesAction(enr.id);
    if (res.replied) { showFb("ok", "Réponse détectée !"); onAction(); }
    else             { showFb("info", "Pas encore de réponse"); }
    setChecking(false);
  }

  function handleUnenroll() {
    if (!confirm("Retirer ce contact de la séquence ?")) return;
    startUenr(async () => { await unenrollContactAction(enr.id); onAction(); });
  }

  const canSend = gmailConnected && enr.status === "ACTIVE" && enr.currentStepOrder < totalSteps;
  const canCheck = enr.status === "ACTIVE" && enr.currentStepOrder > 0;

  return (
    <tr className={`border-b border-border last:border-b-0 transition-colors ${
      enr.status === "REPLIED" ? "bg-purple-50/40" : "hover:bg-bg/40"
    }`}>
      {/* Contact */}
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex-none grid place-items-center text-[11px] font-bold ${
            enr.status === "REPLIED"   ? "bg-purple-100 text-purple-600" :
            enr.status === "COMPLETED" ? "bg-navy/10 text-navy" :
            enr.status === "ACTIVE"    ? "bg-teal/10 text-teal" :
            "bg-gray-100 text-gray-400"
          }`}>
            {initials(`${enr.contact.firstName} ${enr.contact.lastName}`)}
          </div>
          <div className="min-w-0">
            <Link href={`/contacts/${enr.contact.id}`} className="text-[13px] font-semibold text-text-1 hover:text-teal transition-colors block truncate">
              {enr.contact.firstName} {enr.contact.lastName}
            </Link>
            <div className="text-[11px] text-text-3 truncate">{enr.contact.email}</div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-none ${cfg.dot}`} />
          <span className={`text-[12px] font-semibold ${cfg.text}`}>{cfg.label}</span>
        </div>
      </td>

      {/* Progress dots */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.max(totalSteps, 1) }, (_, i) => {
              const isDone    = i < enr.currentStepOrder;
              const isCurrent = i === enr.currentStepOrder && enr.status === "ACTIVE";
              const isReplied = enr.status === "REPLIED" && i < enr.currentStepOrder;
              return (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    isReplied                ? "w-2 bg-purple-400" :
                    isDone                   ? "w-2 bg-teal" :
                    isCurrent                ? "w-2 bg-teal ring-2 ring-teal/30 ring-offset-1" :
                    "w-2 bg-border"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[10px] text-text-3 font-medium ml-1">
            {enr.status === "COMPLETED" ? "✓" : `${enr.currentStepOrder}/${totalSteps}`}
          </span>
        </div>
      </td>

      {/* Next send */}
      <td className="px-4 py-3">
        {enr.status === "ACTIVE" && enr.nextSendAt ? (
          <div>
            <div className="text-[12px] font-medium text-text-1">{fmtRelative(enr.nextSendAt)}</div>
            <div className="text-[10px] text-text-3">{fmtDate(enr.nextSendAt)}</div>
          </div>
        ) : (
          <span className="text-[12px] text-text-3">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {/* Feedback */}
          {feedback && (
            <span className={`text-[11px] font-semibold mr-1 ${
              feedback.type === "ok" ? "text-teal" :
              feedback.type === "err" ? "text-lh-red" : "text-text-3"
            }`}>
              {feedback.msg}
            </span>
          )}

          {/* Send */}
          {canSend && (
            <button
              onClick={handleSend}
              disabled={sending || checking || uenrPending}
              className="px-3 py-1.5 rounded-lg bg-teal text-white text-[11px] font-bold hover:bg-teal/80 disabled:opacity-50 transition-colors min-w-[76px] text-center"
            >
              {sending ? <span className="animate-spin inline-block text-[12px]">↻</span> : "▶ Envoyer"}
            </button>
          )}

          {/* Check replies */}
          {canCheck && !canSend && (
            <button
              onClick={handleCheck}
              disabled={sending || checking}
              className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-text-2 hover:bg-bg disabled:opacity-50 transition-colors"
            >
              {checking ? "…" : "↩ Réponse ?"}
            </button>
          )}

          {/* Contact link */}
          {enr.status === "REPLIED" && (
            <Link
              href={`/contacts/${enr.contact.id}`}
              className="px-3 py-1.5 rounded-lg border border-purple-200 text-[11px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
            >
              Contacter →
            </Link>
          )}

          {/* Remove */}
          <button
            onClick={handleUnenroll}
            disabled={uenrPending}
            className="w-7 h-7 rounded-lg grid place-items-center text-text-3 hover:text-lh-red hover:bg-lh-red-bg transition-all text-[12px]"
            title="Retirer"
          >
            {uenrPending ? "…" : "✕"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Edit step form ───────────────────────────────────────────────

function EditStepForm({ step, isFirst, onSaved, onDeleted }: {
  step: Step; isFirst: boolean; onSaved: ()=>void; onDeleted: ()=>void;
}) {
  const [subject, setSubject]   = useState(step.subject);
  const [body, setBody]         = useState(step.bodyMarkdown);
  const [delay, setDelay]       = useState(step.delayDays);
  const [pending, start]        = useTransition();
  const [delPending, startDel]  = useTransition();
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setError("Le sujet est obligatoire."); return; }
    if (!body.trim())    { setError("Le corps est obligatoire."); return; }
    start(async () => {
      await updateSequenceStepAction({ stepId: step.id, subject: subject.trim(), bodyMarkdown: body.trim(), delayDays: delay });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer cette étape ?")) return;
    startDel(async () => { await deleteSequenceStepAction(step.id); onDeleted(); });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {error && (
        <div className="px-3 py-2 bg-lh-red-bg border border-lh-red/30 rounded-lg text-[12px] text-lh-red">
          {error}
        </div>
      )}

      {!isFirst && (
        <div>
          <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-2">
            Délai depuis l'étape précédente
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={90} value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-border bg-bg text-[13px] text-text-1 focus:outline-none focus:border-teal/60 text-center font-bold"
            />
            <span className="text-[13px] text-text-2">jour{delay > 1 ? "s" : ""}</span>
            <span className="text-[11px] text-text-3 px-2 py-1 bg-bg border border-border rounded-lg">
              {delay === 0 ? "Envoi immédiat" : `J+${delay}`}
            </span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-2">
          Objet de l'email
        </label>
        <input
          value={subject}
          onChange={(e) => { setSubject(e.target.value); setError(""); }}
          placeholder="Ex : Une question rapide, {{firstName}}"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-teal/60 focus:ring-2 focus:ring-teal/10 transition-all"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold text-text-2 uppercase tracking-wide">
            Corps de l'email
          </label>
          <div className="flex items-center gap-1">
            {["{{firstName}}", "{{lastName}}"].map(v => (
              <button
                key={v} type="button"
                onClick={() => setBody(b => b + v)}
                className="text-[9px] font-mono px-1.5 py-0.5 bg-bg border border-border rounded hover:bg-teal/5 hover:border-teal/30 transition-colors text-text-3"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setError(""); }}
          rows={14}
          placeholder={"Bonjour {{firstName}},\n\nJ'espère que vous allez bien.\n\n...\n\nCordialement,\nVincent"}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] text-text-1 placeholder:text-text-3 font-mono focus:outline-none focus:border-teal/60 focus:ring-2 focus:ring-teal/10 transition-all resize-y leading-relaxed"
        />
        <div className="text-[10px] text-text-3 mt-1.5 flex items-center gap-1.5">
          <span>Markdown supporté :</span>
          <code className="px-1 bg-bg border border-border rounded">**gras**</code>
          <code className="px-1 bg-bg border border-border rounded">*italique*</code>
          <code className="px-1 bg-bg border border-border rounded">[lien](url)</code>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <button
          type="button" onClick={handleDelete} disabled={delPending}
          className="px-3 py-2 rounded-lg text-[12px] font-semibold text-lh-red hover:bg-lh-red-bg border border-transparent hover:border-lh-red/20 transition-all disabled:opacity-50"
        >
          {delPending ? "Suppression…" : "Supprimer cette étape"}
        </button>
        <button
          type="submit" disabled={pending}
          className={`px-5 py-2 rounded-lg text-[13px] font-bold transition-all ${
            saved
              ? "bg-teal text-white"
              : "bg-navy text-white hover:bg-navy/80"
          } disabled:opacity-50`}
        >
          {pending ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

// ─── Add step form ────────────────────────────────────────────────

function AddStepForm({ sequenceId, isFirst, onCancel, onSaved }: {
  sequenceId: string; isFirst: boolean; onCancel: ()=>void; onSaved: (id:string)=>void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");
  const [delay, setDelay]     = useState(isFirst ? 0 : 3);
  const [pending, start]      = useTransition();
  const [error, setError]     = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) { setError("Le sujet est obligatoire."); return; }
    if (!body.trim())    { setError("Le corps est obligatoire."); return; }
    start(async () => {
      const res = await addSequenceStepAction({
        sequenceId, subject: subject.trim(), bodyMarkdown: body.trim(), delayDays: delay,
      });
      if (res.ok) onSaved(res.stepId);
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {error && (
        <div className="px-3 py-2 bg-lh-red-bg border border-lh-red/30 rounded-lg text-[12px] text-lh-red">
          {error}
        </div>
      )}

      {!isFirst && (
        <div>
          <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-2">
            Délai depuis l'étape précédente
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number" min={0} max={90} value={delay}
              onChange={e => setDelay(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-border bg-bg text-[13px] focus:outline-none focus:border-teal/60 text-center font-bold"
            />
            <span className="text-[13px] text-text-2">jour{delay > 1 ? "s" : ""}</span>
            {delay === 0 && (
              <span className="text-[11px] text-teal font-semibold">Envoi immédiat</span>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-2">Objet</label>
        <input
          autoFocus value={subject}
          onChange={e => { setSubject(e.target.value); setError(""); }}
          placeholder="Ex : Une question rapide, {{firstName}}"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] placeholder:text-text-3 focus:outline-none focus:border-teal/60 transition-all"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold text-text-2 uppercase tracking-wide">Corps</label>
          <div className="flex items-center gap-1">
            {["{{firstName}}", "{{lastName}}"].map(v => (
              <button key={v} type="button" onClick={() => setBody(b => b + v)}
                className="text-[9px] font-mono px-1.5 py-0.5 bg-bg border border-border rounded hover:border-teal/30 text-text-3"
              >{v}</button>
            ))}
          </div>
        </div>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); setError(""); }}
          rows={12}
          placeholder={"Bonjour {{firstName}},\n\n...\n\nCordialement,\nVincent"}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] placeholder:text-text-3 font-mono focus:outline-none focus:border-teal/60 transition-all resize-y"
        />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-[12px] font-semibold text-text-2 hover:bg-bg">
          Annuler
        </button>
        <button type="submit" disabled={pending}
          className="px-5 py-2 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy/80 disabled:opacity-50">
          {pending ? "Ajout…" : "Ajouter l'étape"}
        </button>
      </div>
    </form>
  );
}

// ─── Enroll modal ─────────────────────────────────────────────────

function EnrollModal({ sequenceId, contacts, onClose, onEnrolled }: {
  sequenceId: string; contacts: Contact[]; onClose: ()=>void; onEnrolled: ()=>void;
}) {
  const [query, setQuery]        = useState("");
  const [selected, setSelected]  = useState<string[]>([]);
  const [pending, start]         = useTransition();
  const [error, setError]        = useState("");

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(query.toLowerCase())
  );

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function handleEnroll() {
    if (selected.length === 0) return;
    start(async () => {
      for (const contactId of selected) {
        const res = await enrollContactAction({ sequenceId, contactId });
        if (!res.ok) { setError(res.error); return; }
      }
      onEnrolled();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between flex-none">
          <div>
            <div className="text-[15px] font-bold text-navy">Inscrire des contacts</div>
            <div className="text-[12px] text-text-3 mt-0.5">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""} disponible{contacts.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-text-3 hover:text-text-1 hover:bg-bg text-[16px]">✕</button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 flex-none border-b border-border">
          <input
            autoFocus value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-[13px] placeholder:text-text-3 focus:outline-none focus:border-teal/60"
          />
        </div>

        {error && (
          <div className="px-6 py-2 text-[12px] text-lh-red font-semibold bg-lh-red-bg border-b border-lh-red/20">{error}</div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-text-3">Aucun contact disponible.</div>
          ) : (
            filtered.map(c => {
              const checked = selected.includes(c.id);
              return (
                <button
                  key={c.id} onClick={() => toggle(c.id)}
                  className={`w-full px-6 py-3 text-left border-b border-border last:border-b-0 flex items-center gap-3.5 transition-colors ${
                    checked ? "bg-teal/5" : "hover:bg-bg"
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded border-2 flex-none grid place-items-center transition-all ${
                    checked ? "border-teal bg-teal" : "border-border"
                  }`}>
                    {checked && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex-none grid place-items-center text-[11px] font-bold ${
                    checked ? "bg-teal/20 text-teal" : "bg-navy/10 text-navy"
                  }`}>
                    {initials(`${c.firstName} ${c.lastName}`)}
                  </div>
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-text-1 truncate">{c.firstName} {c.lastName}</div>
                    <div className="text-[11px] text-text-3 truncate">{c.email}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-none">
          <span className="text-[12px] text-text-3">
            {selected.length > 0
              ? `${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`
              : "Aucune sélection"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-[12px] font-semibold text-text-2 hover:bg-bg"
            >
              Annuler
            </button>
            <button
              onClick={handleEnroll}
              disabled={pending || selected.length === 0}
              className="px-4 py-2 rounded-lg bg-navy text-white text-[12px] font-bold hover:bg-navy/80 disabled:opacity-50 transition-colors min-w-[100px] text-center"
            >
              {pending ? "Inscription…" : `Inscrire (${selected.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
