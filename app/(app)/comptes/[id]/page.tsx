import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Chip, ScoreCircle } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { CompteActions } from "./CompteActions";
import { CompanyEditForm } from "./CompanyEditForm";
import { ContactsManager } from "./ContactsManager";

export const dynamic = "force-dynamic";

// ─── Types & config ───────────────────────────────────────────────────────────

const TABS = ["informations", "contacts", "deals", "activites", "taches"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  informations: "Informations",
  contacts:     "Contacts",
  deals:        "Deals",
  activites:    "Activités",
  taches:       "Tâches",
};

const STATUS_CONFIG: Record<string, { label: string; color: "navy" | "teal" | "gold" | "red" }> = {
  PROSPECT: { label: "Prospect", color: "navy" },
  LEAD:     { label: "Lead",     color: "teal" },
  CLIENT:   { label: "Client",   color: "gold" },
  LOST:     { label: "Perdu",    color: "red" },
};

const STAGE_CONFIG: Record<string, { label: string; color: "navy" | "blue" | "purple" | "amber" | "green" | "red" }> = {
  QUALIFICATION: { label: "Qualification", color: "navy" },
  DEMO:          { label: "Démo",          color: "blue" },
  PROPOSAL:      { label: "Proposition",   color: "purple" },
  NEGOTIATION:   { label: "Négociation",   color: "amber" },
  WON:           { label: "Gagné",         color: "green" },
  LOST:          { label: "Perdu",         color: "red" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: "red" | "amber" | "blue" | "navy" }> = {
  URGENT: { label: "Urgent", color: "red" },
  HIGH:   { label: "Haute",  color: "amber" },
  NORMAL: { label: "Normale",color: "blue" },
  LOW:    { label: "Basse",  color: "navy" },
};

const ACTIVITY_ICON: Record<string, string> = {
  EMAIL_IN:      "📥",
  EMAIL_OUT:     "📤",
  CALL:          "📞",
  MEETING:       "🤝",
  NOTE:          "📝",
  TASK_DONE:     "✓",
  DEAL_MOVED:    "↗",
  SEQUENCE_SENT: "✉",
  SIGNAL:        "⚡",
  ENRICHMENT:    "🔍",
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d}j`;
  return date.toLocaleDateString("fr-FR");
}

// ─── Page ────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: "Fiche compte" };
}

export default async function CompteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tenantId } = await requireTenant();
  const { id }          = await params;
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.includes(tabParam as Tab) ? tabParam : "informations") as Tab;

  const company = await prisma.company.findFirst({
    where: { id, tenantId },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
      },
      deals: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          primaryContact: { select: { firstName: true, lastName: true } },
          owner:          { select: { name: true } },
        },
      },
      activities: {
        orderBy:  { createdAt: "desc" },
        take:     60,
        include:  { createdBy: { select: { name: true } } },
      },
      tasks: {
        where:   { status: { not: "DONE" } },
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      },
    },
  });

  if (!company) notFound();

  const statusConfig = STATUS_CONFIG[company.status] ?? STATUS_CONFIG.PROSPECT;
  const openDeals    = company.deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
  const wonDeals     = company.deals.filter((d) => d.stage === "WON");
  const totalWon     = wonDeals.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title={company.name}
        subtitle={[company.legalForm, company.city].filter(Boolean).join(" · ")}
        breadcrumbs={[
          { label: "Ventes" },
          { label: "Comptes", href: "/comptes" },
          { label: company.name },
        ]}
        actions={
          <CompteActions
            companyId={company.id}
            currentStatus={company.status}
            companyName={company.name}
          />
        }
      />

      {/* Summary strip */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ScoreCircle score={company.icp ?? 0} />
          <span className="text-[11px] text-text-3">Score ICP</span>
        </div>
        <Chip color={statusConfig.color}>{statusConfig.label}</Chip>
        {company.region && (
          <span className="text-[12px] text-text-2">{company.region}</span>
        )}
        {company.nafBucket && (
          <span className="text-[12px] text-text-2 capitalize">{company.nafBucket}</span>
        )}
        {company.headcountBand && (
          <span className="text-[12px] text-text-3 bg-bg px-2 py-0.5 rounded border border-border font-mono">
            {company.headcountBand} sal.
          </span>
        )}
        {company.website && (
          <a
            href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-teal hover:underline"
          >
            {company.website}
          </a>
        )}
        <div className="ml-auto flex items-center gap-4 text-[12px] text-text-3">
          <span>
            <strong className="text-text-1">{company.contacts.length}</strong> contact
            {company.contacts.length > 1 ? "s" : ""}
          </span>
          <span>
            <strong className="text-text-1">{openDeals.length}</strong> deal
            {openDeals.length > 1 ? "s" : ""} ouverts
          </span>
          {totalWon > 0 && (
            <span>
              <strong className="text-lh-green">
                {totalWon.toLocaleString("fr-FR")} €
              </strong>{" "}
              gagnés
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-surface border-b border-border px-6 flex items-end gap-0">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/comptes/${company.id}?tab=${t}` as never}
            className={cn(
              "px-4 py-3 text-[12px] font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              tab === t
                ? "border-teal text-navy"
                : "border-transparent text-text-3 hover:text-text-1 hover:border-border"
            )}
          >
            {TAB_LABELS[t]}
            {t === "contacts" && company.contacts.length > 0 && (
              <span className="text-[10px] bg-bg border border-border rounded-full px-1.5 py-px">
                {company.contacts.length}
              </span>
            )}
            {t === "deals" && company.deals.length > 0 && (
              <span className="text-[10px] bg-bg border border-border rounded-full px-1.5 py-px">
                {company.deals.length}
              </span>
            )}
            {t === "taches" && company.tasks.length > 0 && (
              <span className="text-[10px] bg-lh-red-bg text-lh-red border border-lh-red/20 rounded-full px-1.5 py-px">
                {company.tasks.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "informations" && <CompanyEditForm company={company} />}
        {tab === "contacts" && (
          <ContactsManager contacts={company.contacts} companyId={company.id} />
        )}
        {tab === "deals" && <TabDeals deals={company.deals} />}
        {tab === "activites" && <TabActivites activities={company.activities} />}
        {tab === "taches" && <TabTaches tasks={company.tasks} />}
      </div>
    </div>
  );
}

// ─── Tab: Deals ──────────────────────────────────────────────────────────────

function TabDeals({
  deals,
}: {
  deals: {
    id: string;
    name: string;
    amount: unknown;
    currency: string;
    stage: string;
    probability: number;
    expectedCloseAt?: Date | null;
    primaryContact?: { firstName?: string | null; lastName: string } | null;
  }[];
}) {
  if (deals.length === 0) {
    return (
      <div className="text-center py-16 text-text-3">
        <div className="text-4xl mb-3">⊞</div>
        <div className="text-[14px] font-semibold text-text-2 mb-1">Aucun deal</div>
        <div className="text-[12px]">
          Créez un deal via le bouton "Nouveau deal" en haut à droite.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden max-w-3xl">
      <table className="w-full">
        <thead>
          <tr className="bg-bg border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-3">
            <th className="text-left px-4 py-3 min-w-[200px]">Deal</th>
            <th className="text-left px-4 py-3">Stage</th>
            <th className="text-right px-4 py-3">Montant</th>
            <th className="text-right px-4 py-3">Proba</th>
            <th className="text-left px-4 py-3">Clôture</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d) => {
            const stage = STAGE_CONFIG[d.stage] ?? STAGE_CONFIG.QUALIFICATION;
            return (
              <tr
                key={d.id}
                className="border-b border-border last:border-b-0 hover:bg-bg/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="text-[13px] font-semibold text-navy">{d.name}</div>
                  {d.primaryContact && (
                    <div className="text-[11px] text-text-3">
                      {[d.primaryContact.firstName, d.primaryContact.lastName]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Chip color={stage.color}>{stage.label}</Chip>
                </td>
                <td className="px-4 py-3 text-right text-[13px] font-mono font-semibold text-text-1">
                  {Number(d.amount).toLocaleString("fr-FR")} {d.currency}
                </td>
                <td className="px-4 py-3 text-right text-[12px] font-mono text-text-3">
                  {d.probability}%
                </td>
                <td className="px-4 py-3 text-[12px] text-text-2">
                  {d.expectedCloseAt
                    ? new Date(d.expectedCloseAt).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Activités ──────────────────────────────────────────────────────────

function TabActivites({
  activities,
}: {
  activities: {
    id: string;
    type: string;
    subject: string;
    body?: string | null;
    createdAt: Date;
    createdBy?: { name?: string | null } | null;
  }[];
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-16 text-text-3">
        <div className="text-4xl mb-3">⏱</div>
        <div className="text-[14px] font-semibold text-text-2">Aucune activité</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-2">
      {activities.map((a) => (
        <div
          key={a.id}
          className="flex gap-3 p-4 bg-surface rounded-xl border border-border"
        >
          <div className="text-xl shrink-0 w-7 text-center">
            {ACTIVITY_ICON[a.type] ?? "•"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text-1">{a.subject}</div>
            {a.body && (
              <div className="text-[12px] text-text-2 mt-0.5 line-clamp-2">{a.body}</div>
            )}
            {a.createdBy?.name && (
              <div className="text-[11px] text-text-3 mt-1">{a.createdBy.name}</div>
            )}
          </div>
          <div className="text-[11px] text-text-3 shrink-0 whitespace-nowrap">
            {timeAgo(new Date(a.createdAt))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Tâches ─────────────────────────────────────────────────────────────

function TabTaches({
  tasks,
}: {
  tasks: {
    id: string;
    title: string;
    description?: string | null;
    priority: string;
    dueAt?: Date | null;
  }[];
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-text-3">
        <div className="text-4xl mb-3">✓</div>
        <div className="text-[14px] font-semibold text-text-2">Aucune tâche en cours</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-2">
      {tasks.map((t) => {
        const prio    = PRIORITY_CONFIG[t.priority] ?? PRIORITY_CONFIG.NORMAL;
        const isLate  = t.dueAt && new Date(t.dueAt) < new Date();
        return (
          <div
            key={t.id}
            className="flex items-start gap-3 p-4 bg-surface rounded-xl border border-border"
          >
            <div className="mt-0.5 w-4 h-4 rounded border-2 border-border shrink-0 flex-none" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-1">{t.title}</div>
              {t.description && (
                <div className="text-[12px] text-text-2 mt-0.5">{t.description}</div>
              )}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Chip color={prio.color}>{prio.label}</Chip>
                {t.dueAt && (
                  <span
                    className={`text-[11px] ${
                      isLate ? "text-lh-red font-semibold" : "text-text-3"
                    }`}
                  >
                    {isLate ? "En retard · " : ""}
                    {new Date(t.dueAt).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
