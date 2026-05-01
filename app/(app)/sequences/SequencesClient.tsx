"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import Link                        from "next/link";
import { createSequenceAction, deleteSequenceAction } from "@/app/_actions/sequences";
import { sendNextSequenceStepAction, checkAllRepliesAction } from "@/app/_actions/gmail";

// ─── Types ────────────────────────────────────────────────────────

type Seq = {
  id: string; name: string; description: string | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  fromName: string | null; steps: number; enrolled: number; createdAt: string;
};

type QueueItem = {
  enrollmentId: string; contactId: string; contactName: string; contactEmail: string;
  sequenceId: string; sequenceName: string;
  currentStepOrder: number; totalSteps: number; nextSendAt: string | null;
};

type ReplyItem = {
  enrollmentId: string; contactId: string; contactName: string; contactEmail: string;
  sequenceId: string; sequenceName: string; repliedAt: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function fmtDate(iso: string | null, time = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return "Il y a moins d'1h";
  if (h < 24) return `Il y a ${h}h`;
  return fmtDate(iso);
}

const STATUS_LABEL: Record<Seq["status"], string> = {
  DRAFT: "Brouillon", ACTIVE: "Active", PAUSED: "Pausée", ARCHIVED: "Archivée",
};
const STATUS_DOT: Record<Seq["status"], string> = {
  DRAFT: "bg-amber-400", ACTIVE: "bg-teal", PAUSED: "bg-slate-400", ARCHIVED: "bg-gray-300",
};

// ─── Root ─────────────────────────────────────────────────────────

export function SequencesClient({
  sequences, queue, replies,
}: {
  sequences: Seq[];
  queue:     QueueItem[];
  replies:   ReplyItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"sequences" | "queue" | "replies">("sequences");
  const [showCreate, setShowCreate] = useState(false);

  const tabs = [
    { key: "sequences", label: "Séquences",      badge: sequences.length, urgent: false },
    { key: "queue",     label: "À envoyer",       badge: queue.length,     urgent: queue.length > 0 },
    { key: "replies",   label: "Réponses",         badge: replies.length,   urgent: false },
  ] as const;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Action banner ─────────────────────────────────────── */}
      {queue.length > 0 && tab !== "queue" && (
        <ActionBanner count={queue.length} onGoToQueue={() => setTab("queue")} />
      )}

      {/* ── Nav bar ───────────────────────────────────────────── */}
      <div className="flex-none border-b border-border bg-bg px-6 flex items-center justify-between">
        <div className="flex">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
                tab === t.key
                  ? "border-teal text-teal"
                  : "border-transparent text-text-3 hover:text-text-1"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black min-w-[18px] text-center ${
                  t.urgent && tab !== t.key
                    ? "bg-lh-red text-white"
                    : tab === t.key
                    ? "bg-teal/20 text-teal"
                    : "bg-border text-text-2"
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white rounded-lg text-[12px] font-bold hover:bg-navy/80 transition-colors my-2"
        >
          + Nouvelle séquence
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {tab === "sequences" && (
          <SequencesTab
            sequences={sequences}
            onNew={() => setShowCreate(true)}
          />
        )}
        {tab === "queue" && (
          <QueueTab queue={queue} onSent={() => router.refresh()} />
        )}
        {tab === "replies" && (
          <RepliesTab replies={replies} />
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); router.push(`/sequences/${id}`); }}
        />
      )}
    </div>
  );
}

// ─── Action banner ────────────────────────────────────────────────

function ActionBanner({ count, onGoToQueue }: { count: number; onGoToQueue: () => void }) {
  return (
    <div className="flex-none bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-[13px] font-semibold text-amber-800">
          {count} email{count > 1 ? "s" : ""} en attente d'envoi aujourd'hui
        </span>
      </div>
      <button
        onClick={onGoToQueue}
        className="text-[12px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
      >
        Voir la file →
      </button>
    </div>
  );
}

// ─── Séquences tab ────────────────────────────────────────────────

function SequencesTab({ sequences, onNew }: { sequences: Seq[]; onNew: () => void }) {
  if (sequences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-navy/5 border border-border grid place-items-center text-[24px] mb-4">✉</div>
        <div className="text-[15px] font-bold text-text-1 mb-1">Aucune séquence</div>
        <div className="text-[13px] text-text-3 max-w-xs mb-5">
          Créez votre première séquence pour automatiser vos relances commerciales.
        </div>
        <button
          onClick={onNew}
          className="px-4 py-2.5 bg-navy text-white rounded-lg text-[13px] font-bold hover:bg-navy/80 transition-colors"
        >
          + Créer une séquence
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sequences.map(seq => <SequenceCard key={seq.id} seq={seq} />)}
      </div>
    </div>
  );
}

// ─── Sequence card ────────────────────────────────────────────────

function SequenceCard({ seq }: { seq: Seq }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Supprimer « ${seq.name} » ?`)) return;
    start(async () => { await deleteSequenceAction(seq.id); router.refresh(); });
  }

  return (
    <Link
      href={`/sequences/${seq.id}`}
      className="block bg-surface rounded-xl border border-border hover:border-teal/30 hover:shadow-sm transition-all group"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-navy group-hover:text-teal transition-colors truncate">
              {seq.name}
            </div>
            {seq.description && (
              <div className="text-[12px] text-text-3 mt-0.5 line-clamp-2">{seq.description}</div>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-3 hover:text-lh-red hover:bg-lh-red-bg transition-all text-[12px] flex-none"
          >
            {pending ? "…" : "✕"}
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-none ${STATUS_DOT[seq.status]}`} />
          <span className="text-[11px] font-semibold text-text-2">{STATUS_LABEL[seq.status]}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-5">
        <div>
          <div className="text-[16px] font-black text-text-1">{seq.steps}</div>
          <div className="text-[10px] text-text-3 font-semibold uppercase tracking-wide">Étapes</div>
        </div>
        <div className="w-px h-6 bg-border" />
        <div>
          <div className="text-[16px] font-black text-text-1">{seq.enrolled}</div>
          <div className="text-[10px] text-text-3 font-semibold uppercase tracking-wide">Inscrits</div>
        </div>
        <div className="flex-1" />
        <div className="text-[10px] text-text-3">
          {new Date(seq.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
        </div>
      </div>
    </Link>
  );
}

// ─── Queue tab ────────────────────────────────────────────────────

function QueueTab({ queue, onSent }: { queue: QueueItem[]; onSent: () => void }) {
  const [sending, setSending]     = useState<string | null>(null);
  const [sent, setSent]           = useState<Set<string>>(new Set());
  const [errors, setErrors]       = useState<Set<string>>(new Set());
  const [bulkPending, startBulk]  = useTransition();

  async function sendOne(enrollmentId: string) {
    setSending(enrollmentId);
    const res = await sendNextSequenceStepAction(enrollmentId);
    if (res.ok) {
      setSent(s => new Set([...s, enrollmentId]));
      onSent();
    } else {
      setErrors(e => new Set([...e, enrollmentId]));
    }
    setSending(null);
  }

  function sendAll() {
    startBulk(async () => {
      for (const item of queue) {
        if (sent.has(item.enrollmentId) || errors.has(item.enrollmentId)) continue;
        setSending(item.enrollmentId);
        const res = await sendNextSequenceStepAction(item.enrollmentId);
        if (res.ok) setSent(s => new Set([...s, item.enrollmentId]));
        else        setErrors(e => new Set([...e, item.enrollmentId]));
        setSending(null);
      }
      onSent();
    });
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal/10 border border-teal/20 grid place-items-center text-[24px] mb-4">✓</div>
        <div className="text-[15px] font-bold text-text-1 mb-1">Tout est à jour</div>
        <div className="text-[13px] text-text-3">Aucun email à envoyer aujourd'hui.</div>
      </div>
    );
  }

  const pendingCount = queue.filter(q => !sent.has(q.enrollmentId) && !errors.has(q.enrollmentId)).length;

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[15px] font-bold text-navy">
            {pendingCount} email{pendingCount !== 1 ? "s" : ""} à envoyer
          </div>
          <div className="text-[12px] text-text-3 mt-0.5">
            Contacts dont le délai est écoulé — prêts à recevoir le prochain email.
          </div>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={sendAll}
            disabled={bulkPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal text-white rounded-xl text-[13px] font-bold hover:bg-teal/80 transition-colors disabled:opacity-50 shadow-sm"
          >
            {bulkPending
              ? <><span className="animate-spin inline-block">↻</span> Envoi…</>
              : <>▶ Envoyer tout ({pendingCount})</>
            }
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {queue.map(item => {
          const isSent   = sent.has(item.enrollmentId);
          const isError  = errors.has(item.enrollmentId);
          const isLoading = sending === item.enrollmentId;

          return (
            <div
              key={item.enrollmentId}
              className={`rounded-xl border p-4 flex items-center gap-4 transition-all ${
                isSent  ? "bg-teal/5 border-teal/20"    :
                isError ? "bg-lh-red-bg border-lh-red/20" :
                "bg-surface border-border hover:border-teal/20"
              }`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex-none grid place-items-center text-[13px] font-bold ${
                isSent ? "bg-teal/20 text-teal" : "bg-navy/10 text-navy"
              }`}>
                {isSent ? "✓" : initials(item.contactName)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-text-1">{item.contactName}</div>
                <div className="text-[11px] text-text-3 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>{item.contactEmail}</span>
                  <span className="text-border">·</span>
                  <Link href={`/sequences/${item.sequenceId}`} className="text-navy font-medium hover:underline">
                    {item.sequenceName}
                  </Link>
                  <span className="text-border">·</span>
                  <span>Étape {item.currentStepOrder + 1}/{item.totalSteps}</span>
                </div>
              </div>

              {/* Date */}
              {!isSent && !isError && (
                <div className="text-right flex-none">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">En attente</div>
                  <div className="text-[12px] text-text-2 font-medium mt-0.5">
                    {fmtDate(item.nextSendAt)}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex-none">
                {isSent ? (
                  <span className="text-[12px] font-bold text-teal">Envoyé</span>
                ) : isError ? (
                  <span className="text-[12px] font-bold text-lh-red">Erreur</span>
                ) : (
                  <button
                    onClick={() => sendOne(item.enrollmentId)}
                    disabled={isLoading || bulkPending}
                    className="px-3.5 py-2 rounded-lg bg-teal text-white text-[12px] font-bold hover:bg-teal/80 disabled:opacity-50 transition-colors min-w-[90px] text-center"
                  >
                    {isLoading ? <span className="animate-spin inline-block">↻</span> : "▶ Envoyer"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Replies tab ──────────────────────────────────────────────────

function RepliesTab({ replies }: { replies: ReplyItem[] }) {
  const router = useRouter();
  const [syncing, startSync] = useTransition();
  const [syncResult, setSyncResult] = useState<{ found: number; checked: number } | null>(null);

  function handleSync() {
    setSyncResult(null);
    startSync(async () => {
      const res = await checkAllRepliesAction();
      if (res.ok) {
        setSyncResult({ found: res.found, checked: res.checked });
        router.refresh();
      }
    });
  }

  const SyncButton = () => (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-text-2 hover:bg-bg hover:border-teal/30 hover:text-teal transition-all disabled:opacity-50"
    >
      <span className={syncing ? "animate-spin inline-block" : ""}>↻</span>
      {syncing ? "Vérification…" : "Vérifier les réponses"}
    </button>
  );

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 grid place-items-center text-[24px] mb-4">↩</div>
        <div className="text-[15px] font-bold text-text-1 mb-1">Aucune réponse</div>
        <div className="text-[12px] text-text-3 mb-5">
          Synchronisez pour détecter les nouvelles réponses Gmail.
        </div>
        <SyncButton />
        {syncResult && (
          <div className="mt-3 text-[12px] text-text-3">
            {syncResult.found > 0
              ? <span className="text-teal font-semibold">✓ {syncResult.found} réponse{syncResult.found > 1 ? "s" : ""} détectée{syncResult.found > 1 ? "s" : ""}</span>
              : <span>Aucune nouvelle réponse ({syncResult.checked} contacts vérifiés)</span>
            }
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-bold text-navy">
            {replies.length} réponse{replies.length > 1 ? "s" : ""} reçue{replies.length > 1 ? "s" : ""}
          </div>
          <div className="text-[12px] text-text-3 mt-0.5">
            Ces contacts ont répondu — priorité à les recontacter.
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SyncButton />
          {syncResult && (
            <span className="text-[11px] text-text-3">
              {syncResult.found > 0
                ? <span className="text-teal font-semibold">+{syncResult.found} nouvelle{syncResult.found > 1 ? "s" : ""}</span>
                : "Aucune nouvelle réponse"
              }
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {replies.map(r => (
          <div
            key={r.enrollmentId}
            className="bg-surface rounded-xl border border-purple-100 p-4 flex items-center gap-4 hover:border-purple-200 transition-colors"
          >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex-none grid place-items-center text-[13px] font-bold">
              {initials(r.contactName)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-semibold text-text-1">{r.contactName}</div>
                <span className="px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-[9px] font-black text-purple-600 uppercase">
                  Réponse
                </span>
              </div>
              <div className="text-[11px] text-text-3 flex items-center gap-1.5 mt-0.5">
                <span>{r.contactEmail}</span>
                <span className="text-border">·</span>
                <Link href={`/sequences/${r.sequenceId}`} className="text-navy font-medium hover:underline">
                  {r.sequenceName}
                </Link>
              </div>
            </div>

            {/* Time */}
            <div className="text-right flex-none">
              <div className="text-[11px] text-text-3">{timeAgo(r.repliedAt)}</div>
            </div>

            {/* CTA */}
            <Link
              href={`/contacts/${r.contactId}`}
              className="flex-none px-3.5 py-2 rounded-lg border border-purple-200 text-[12px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
            >
              Voir →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Create modal ─────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [fromName, setFromName] = useState("");
  const [pending, start]        = useTransition();
  const [error, setError]       = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom est obligatoire."); return; }
    start(async () => {
      const res = await createSequenceAction({
        name: name.trim(),
        description: description.trim() || undefined,
        fromName: fromName.trim() || undefined,
      });
      if (res.ok) onCreated(res.sequenceId);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md border border-border">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div className="text-[15px] font-bold text-navy">Nouvelle séquence</div>
          <button onClick={onClose} className="text-text-3 hover:text-text-1 text-[18px] w-8 h-8 grid place-items-center rounded-lg hover:bg-bg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-lh-red-bg border border-lh-red/30 rounded-lg text-[12px] text-lh-red font-semibold">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-1.5">Nom *</label>
            <input
              autoFocus value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Ex : Prospection architectes Île-de-France"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-teal/60 focus:ring-2 focus:ring-teal/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={description} onChange={(e) => setDesc(e.target.value)} rows={2}
              placeholder="Objectif, cible, contexte…"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-teal/60 focus:ring-2 focus:ring-teal/10 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-2 uppercase tracking-wide mb-1.5">Nom d'expéditeur</label>
            <input
              value={fromName} onChange={(e) => setFromName(e.target.value)}
              placeholder="Ex : Vincent — Lihtea"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-[13px] text-text-1 placeholder:text-text-3 focus:outline-none focus:border-teal/60 focus:ring-2 focus:ring-teal/10 transition-all"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border text-[13px] font-semibold text-text-2 hover:bg-bg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={pending || !name.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-navy text-white text-[13px] font-bold hover:bg-navy/80 transition-colors disabled:opacity-50"
            >
              {pending ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
