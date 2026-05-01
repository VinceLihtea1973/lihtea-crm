import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import Link from "next/link";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)        return "à l'instant";
  if (s < 3600)      return `il y a ${Math.floor(s / 60)}min`;
  if (s < 86400)     return `il y a ${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `il y a ${Math.floor(s / 86400)}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const STAGE_META: Record<string, { label: string; color: string; dot: string; track: string }> = {
  QUALIFICATION: { label: "Qualification", color: "text-teal-bright", dot: "#14b8a6", track: "rgba(20,184,166,.12)" },
  DEMO:          { label: "Démo",          color: "text-[#60a5fa]",   dot: "#3b82f6", track: "rgba(59,130,246,.12)" },
  PROPOSAL:      { label: "Proposition",   color: "text-[#c084fc]",   dot: "#a855f7", track: "rgba(168,85,247,.12)" },
  NEGOTIATION:   { label: "Négociation",   color: "text-[#fbbf24]",   dot: "#f59e0b", track: "rgba(245,158,11,.12)" },
};

const ACTIVITY_ICON: Record<string, string> = {
  EMAIL_IN: "↙", EMAIL_OUT: "↗", CALL: "◎", MEETING: "⊙",
  NOTE: "◈", TASK_DONE: "✓", DEAL_MOVED: "↑", SEQUENCE_SENT: "✉",
  SIGNAL: "⚡", ENRICHMENT: "⊕",
};

function fmtDue(d: Date | null) {
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(d); due.setHours(0,0,0,0);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { label: `${-diff}j retard`, urgent: true };
  if (diff === 0) return { label: "Aujourd'hui",      urgent: true };
  if (diff === 1) return { label: "Demain",           urgent: false };
  return { label: `${diff}j`, urgent: false };
}

export default async function DashboardPage() {
  const { tenantId } = await requireTenant();

  const [companyCounts, deals, recentActivity, urgentTasks] = await Promise.all([
    prisma.company.groupBy({ by: ["status"], where: { tenantId }, _count: true }),
    prisma.deal.findMany({
      where: { tenantId, stage: { notIn: ["WON","LOST"] } },
      select: { stage: true, amount: true, probability: true, name: true, id: true,
                company: { select: { name: true } } },
    }),
    prisma.activity.findMany({
      where: { tenantId }, orderBy: { occurredAt: "desc" }, take: 8,
      select: { id: true, type: true, subject: true, occurredAt: true,
                company: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { tenantId, status: "TODO", dueAt: { lte: new Date(Date.now() + 86400000*3) } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }], take: 5,
      select: { id: true, title: true, priority: true, dueAt: true,
                company: { select: { name: true } } },
    }),
  ]);

  const byStatus        = Object.fromEntries(companyCounts.map(r => [r.status, r._count]));
  const totalCompanies  = companyCounts.reduce((s,r) => s + r._count, 0);
  const pipelineTotal   = deals.reduce((s,d) => s + Number(d.amount), 0);
  const pipelineWeighted= deals.reduce((s,d) => s + Number(d.amount)*(d.probability/100), 0);
  const conversionRate  = totalCompanies > 0
    ? Math.round(((byStatus.CLIENT??0)/totalCompanies)*100) : 0;

  const byStage = ["QUALIFICATION","DEMO","PROPOSAL","NEGOTIATION"].map(stage => {
    const sd = deals.filter(d => d.stage === stage);
    return { stage, count: sd.length, total: sd.reduce((s,d) => s+Number(d.amount),0) };
  });

  const funnelStages = [
    { label: "Prospects", count: byStatus.PROSPECT??0, color: "#0d9488" },
    { label: "Leads",     count: byStatus.LEAD??0,     color: "#3b82f6" },
    { label: "Clients",   count: byStatus.CLIENT??0,   color: "#14b8a6" },
    { label: "Perdus",    count: byStatus.LOST??0,     color: "#64748b" },
  ];
  const maxFunnel = Math.max(...funnelStages.map(s => s.count), 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Vue d'ensemble commerciale"
        breadcrumbs={[{ label: "Pilotage" }, { label: "Dashboard" }]}
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard index={1} label="Entreprises"
            value={String(totalCompanies)} unit=""
            sub={`${byStatus.CLIENT??0} clients`}
            textColor="text-text-1"
            accentColor="rgb(var(--rgb-border))"
          />
          <KpiCard index={2} label="Pipeline total"
            value={fmt(pipelineTotal)} unit="€"
            sub={`${deals.length} deals actifs`}
            textColor="text-teal"
            accentColor="rgba(13,148,136,.30)"
          />
          <KpiCard index={3} label="Pipeline pondéré"
            value={fmt(Math.round(pipelineWeighted))} unit="€"
            sub="Prob. de closing"
            textColor="text-[#60a5fa]"
            accentColor="rgba(96,165,250,.30)"
          />
          <KpiCard index={4} label="Taux conversion"
            value={`${conversionRate}%`} unit=""
            sub="Prospect → Client"
            textColor="text-gold"
            accentColor="rgba(212,168,67,.30)"
          />
        </div>

        {/* ── Widgets row ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Funnel */}
          <Card>
            <CardHeader title="Funnel acquisition" />
            <div className="space-y-2.5 mt-2">
              {funnelStages.map(({ label, count, color }, i) => {
                const pct = count > 0 ? (count / maxFunnel) * 100 : 0;
                const trackAlpha = "18";
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-text-2">{label}</span>
                      <span className="text-[12px] font-mono font-bold text-text-1">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden"
                      style={{ background: `${color}${trackAlpha}` }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: pct > 0 ? `${pct}%` : "8px",
                          background: `linear-gradient(90deg, ${color}88, ${color})`,
                          minWidth: "8px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgb(var(--rgb-border))" }}>
              <Link href="/comptes" className="text-[11px] text-teal font-semibold hover:text-teal-bright transition-colors">
                Voir les comptes →
              </Link>
            </div>
          </Card>

          {/* Pipeline par stage */}
          <Card>
            <CardHeader title="Pipeline par stage" action={{ label: "Kanban →", href: "/pipeline" }} />
            <div className="space-y-1 mt-1">
              {byStage.map(({ stage, count, total }) => {
                const m = STAGE_META[stage];
                return (
                  <div key={stage} className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: "1px solid rgb(var(--rgb-border)/0.6)" }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: m.dot }} />
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${m.color}`}
                        style={{ background: m.track }}>{m.label}</span>
                      <span className="text-[11px] font-mono text-text-3">{count}</span>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-text-1">
                      {total > 0 ? `${fmt(total)} €` : "—"}
                    </span>
                  </div>
                );
              })}
              {byStage.every(s => s.count === 0) && (
                <p className="text-[12px] text-text-3 text-center py-6">
                  Aucun deal —{" "}
                  <Link href="/comptes" className="text-teal hover:underline">créez un deal</Link>
                </p>
              )}
            </div>
          </Card>

          {/* Tâches urgentes */}
          <Card>
            <CardHeader title="À traiter" action={{ label: "Tâches →", href: "/taches" }} />
            <div className="space-y-1 mt-1">
              {urgentTasks.length === 0 && (
                <div className="flex flex-col items-center py-7 gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "var(--c-teal-bg)", border: "1px solid var(--c-teal-border)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  </div>
                  <span className="text-[12px] text-text-3 font-medium">Tout est à jour</span>
                </div>
              )}
              {urgentTasks.map(t => {
                const due = fmtDue(t.dueAt);
                return (
                  <div key={t.id} className="flex items-start gap-2.5 py-2.5"
                    style={{ borderBottom: "1px solid rgb(var(--rgb-border)/0.6)" }}>
                    <span className={`mt-[5px] w-1.5 h-1.5 rounded-full flex-none ${
                      t.priority==="URGENT" ? "bg-red-500" :
                      t.priority==="HIGH"   ? "bg-amber-500" : "bg-teal"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-text-1 truncate">{t.title}</div>
                      {t.company && <div className="text-[10px] text-text-3 mt-0.5">{t.company.name}</div>}
                    </div>
                    {due && (
                      <span className={`text-[10px] font-bold shrink-0 ${due.urgent ? "text-red-400" : "text-text-3"}`}>
                        {due.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Activité récente ──────────────────────────── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-3">Activité récente</span>
            <Link href="/activites" className="text-[11px] text-teal font-semibold hover:text-teal-bright transition-colors">
              Tout voir →
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-[12px] text-text-3 text-center py-8">
              Aucune activité — importez vos premiers comptes via la{" "}
              <Link href="/prospection" className="text-teal hover:underline">Prospection</Link>.
            </p>
          ) : (
            <ul>
              {recentActivity.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid rgb(var(--rgb-border)/0.5)" : undefined }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] flex-none"
                    style={{ background: "rgb(var(--rgb-border))" }}>
                    {ACTIVITY_ICON[a.type] ?? "•"}
                  </span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-[12px] text-text-1 truncate">{a.subject}</span>
                    {a.company && (
                      <Link href={`/comptes/${a.company.id}` as never}
                        className="text-[10px] text-teal font-semibold hover:underline shrink-0 px-1.5 py-0.5 rounded"
                        style={{ background: "var(--c-teal-bg)" }}>
                        {a.company.name}
                      </Link>
                    )}
                  </div>
                  <span className="text-[11px] text-text-3 shrink-0">{timeAgo(a.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 shadow-md"
      style={{
        background: "rgb(var(--rgb-surface))",
        border: "1px solid rgb(var(--rgb-border))",
      }}>
      {children}
    </div>
  );
}

function CardHeader({ title, action }: {
  title: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-3">{title}</span>
      {action && (
        <Link href={action.href as never}
          className="text-[11px] text-teal font-semibold hover:text-teal-bright transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function KpiCard({ index, label, value, unit, sub, textColor, accentColor }: {
  index: 1|2|3|4; label: string; value: string; unit: string;
  sub: string; textColor: string; accentColor: string;
}) {
  return (
    <div
      className="rounded-xl p-5 relative overflow-hidden"
      style={{
        background: `var(--kpi-${index})`,
        border: `1px solid ${accentColor}`,
        boxShadow: "var(--shadow)",
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-3 mb-3">{label}</div>
      <div className={`text-[30px] font-extrabold font-mono leading-none ${textColor} flex items-end gap-1`}>
        {value}
        {unit && <span className="text-[20px] font-bold mb-0.5 opacity-75">{unit}</span>}
      </div>
      <div className="mt-2 text-[12px] text-text-3">{sub}</div>
    </div>
  );
}
