import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import Link from "next/link";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k €`;
  return `${n} €`;
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)        return "à l'instant";
  if (s < 3600)      return `il y a ${Math.floor(s / 60)}min`;
  if (s < 86400)     return `il y a ${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `il y a ${Math.floor(s / 86400)}j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const STAGE_LABEL: Record<string, string> = {
  QUALIFICATION: "Qualification", DEMO: "Démo",
  PROPOSAL: "Proposition",       NEGOTIATION: "Négociation",
};
const STAGE_COLOR: Record<string, string> = {
  QUALIFICATION: "bg-navy/10 text-navy",   DEMO: "bg-blue-100 text-blue-700",
  PROPOSAL: "bg-purple-100 text-purple-700", NEGOTIATION: "bg-amber-100 text-amber-700",
};
const ACTIVITY_ICON: Record<string, string> = {
  EMAIL_IN: "📥", EMAIL_OUT: "📤", CALL: "📞", MEETING: "🤝",
  NOTE: "📝", TASK_DONE: "✓", DEAL_MOVED: "↗", SEQUENCE_SENT: "✉",
  SIGNAL: "⚡", ENRICHMENT: "🔍",
};

function fmtDue(d: Date | null): { label: string; urgent: boolean } | null {
  if (!d) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(d); due.setHours(0,0,0,0);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { label: `Retard ${-diff}j`, urgent: true };
  if (diff === 0) return { label: "Aujourd'hui",      urgent: true };
  if (diff === 1) return { label: "Demain",           urgent: false };
  return { label: `Dans ${diff}j`, urgent: false };
}

export default async function DashboardPage() {
  const { tenantId } = await requireTenant();

  const [companyCounts, deals, recentActivity, urgentTasks] = await Promise.all([
    prisma.company.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    }),
    prisma.deal.findMany({
      where: { tenantId, stage: { notIn: ["WON", "LOST"] } },
      select: { stage: true, amount: true, probability: true, name: true, id: true,
                company: { select: { name: true } } },
    }),
    prisma.activity.findMany({
      where: { tenantId },
      orderBy: { occurredAt: "desc" },
      take: 8,
      select: {
        id: true, type: true, subject: true, occurredAt: true,
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.task.findMany({
      where: { tenantId, status: "TODO",
               dueAt: { lte: new Date(Date.now() + 86400000 * 3) } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 5,
      select: { id: true, title: true, priority: true, dueAt: true,
                company: { select: { name: true } } },
    }),
  ]);

  const byStatus      = Object.fromEntries(companyCounts.map((r) => [r.status, r._count]));
  const totalCompanies = companyCounts.reduce((s, r) => s + r._count, 0);
  const pipelineTotal    = deals.reduce((s, d) => s + Number(d.amount), 0);
  const pipelineWeighted = deals.reduce((s, d) => s + Number(d.amount) * (d.probability / 100), 0);
  const conversionRate   = totalCompanies > 0
    ? Math.round(((byStatus.CLIENT ?? 0) / totalCompanies) * 100) : 0;

  const byStage = ["QUALIFICATION","DEMO","PROPOSAL","NEGOTIATION"].map((stage) => {
    const sd = deals.filter((d) => d.stage === stage);
    return { stage, count: sd.length, total: sd.reduce((s, d) => s + Number(d.amount), 0) };
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Vue d'ensemble commerciale"
        breadcrumbs={[{ label: "Pilotage" }, { label: "Dashboard" }]}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Entreprises" value={String(totalCompanies)} sub={`${byStatus.CLIENT ?? 0} clients`} color="navy" />
            <KpiCard label="Pipeline total" value={fmt(pipelineTotal)} sub={`${deals.length} deals actifs`} color="teal" />
            <KpiCard label="Pipeline pondéré" value={fmt(Math.round(pipelineWeighted))} sub="Prob. de closing" color="blue" />
            <KpiCard label="Taux conversion" value={`${conversionRate}%`} sub="Prospect → Client" color="gold" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funnel */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-3 mb-4">Funnel acquisition</div>
              <div className="space-y-3">
                {[
                  { label: "Prospects", count: byStatus.PROSPECT ?? 0, color: "bg-navy" },
                  { label: "Leads",     count: byStatus.LEAD ?? 0,     color: "bg-blue-500" },
                  { label: "Clients",   count: byStatus.CLIENT ?? 0,   color: "bg-teal" },
                  { label: "Perdus",    count: byStatus.LOST ?? 0,     color: "bg-red-400" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-20 text-[12px] font-semibold text-text-2 shrink-0">{label}</div>
                    <div className="flex-1 bg-bg rounded-full h-2 overflow-hidden">
                      <div className={`${color} h-2 rounded-full`}
                        style={{ width: totalCompanies > 0 ? `${(count / totalCompanies) * 100}%` : "0%" }} />
                    </div>
                    <div className="w-7 text-right text-[13px] font-mono font-bold text-navy shrink-0">{count}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <Link href="/comptes" className="text-[11px] text-teal font-semibold hover:underline">
                  Voir les comptes →
                </Link>
              </div>
            </div>

            {/* Pipeline par stage */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">Pipeline par stage</div>
                <Link href="/pipeline" className="text-[11px] text-teal font-semibold hover:underline">Kanban →</Link>
              </div>
              <div className="space-y-1">
                {byStage.map(({ stage, count, total }) => (
                  <div key={stage} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_COLOR[stage]}`}>
                        {STAGE_LABEL[stage]}
                      </span>
                      <span className="text-[11px] text-text-3">{count}</span>
                    </div>
                    <span className="text-[12px] font-mono font-bold text-navy">{fmt(total)}</span>
                  </div>
                ))}
                {byStage.every((s) => s.count === 0) && (
                  <p className="text-[12px] text-text-3 text-center py-6">
                    Aucun deal actif —{" "}
                    <Link href="/comptes" className="text-teal underline">créez un deal</Link>
                  </p>
                )}
              </div>
            </div>

            {/* Tâches urgentes */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">À traiter</div>
                <Link href="/taches" className="text-[11px] text-teal font-semibold hover:underline">Tâches →</Link>
              </div>
              <div className="space-y-1">
                {urgentTasks.length === 0 && (
                  <p className="text-[12px] text-text-3 text-center py-6">Aucune tâche urgente 🎉</p>
                )}
                {urgentTasks.map((t) => {
                  const due = fmtDue(t.dueAt);
                  return (
                    <div key={t.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                        t.priority === "URGENT" ? "bg-red-500" :
                        t.priority === "HIGH"   ? "bg-amber-500" : "bg-teal"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-text-1 truncate">{t.title}</div>
                        {t.company && <div className="text-[10px] text-text-3">{t.company.name}</div>}
                      </div>
                      {due && (
                        <span className={`text-[10px] font-bold shrink-0 ${due.urgent ? "text-red-500" : "text-text-3"}`}>
                          {due.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-surface rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">Activité récente</div>
              <Link href="/activites" className="text-[11px] text-teal font-semibold hover:underline">Tout voir →</Link>
            </div>
            <ul>
              {recentActivity.length === 0 && (
                <li className="px-5 py-8 text-[12px] text-text-3 text-center">
                  Aucune activité — importez vos premiers comptes via la{" "}
                  <Link href="/prospection" className="text-teal underline">Prospection</Link>.
                </li>
              )}
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-bg/40 transition-colors">
                  <span className="text-[16px] w-7 text-center shrink-0">{ACTIVITY_ICON[a.type] ?? "•"}</span>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-[13px] text-text-1 truncate">{a.subject}</span>
                    {a.company && (
                      <Link href={`/comptes/${a.company.id}` as never}
                        className="text-[11px] text-teal font-semibold hover:underline shrink-0">
                        {a.company.name}
                      </Link>
                    )}
                  </div>
                  <span className="text-[11px] text-text-3 shrink-0">{timeAgo(a.occurredAt)}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: {
  label: string; value: string; sub: string;
  color: "navy" | "teal" | "blue" | "gold";
}) {
  const styles = {
    navy: { border: "border-navy/20",   text: "text-navy"      },
    teal: { border: "border-teal/20",   text: "text-teal"      },
    blue: { border: "border-blue-200",  text: "text-blue-600"  },
    gold: { border: "border-gold/20",   text: "text-gold"      },
  }[color];
  return (
    <div className={`bg-surface rounded-xl border shadow-sm p-5 ${styles.border}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-text-3">{label}</div>
      <div className={`mt-2 text-[26px] font-extrabold font-mono ${styles.text}`}>{value}</div>
      <div className="mt-1 text-[11px] text-text-3">{sub}</div>
    </div>
  );
}
