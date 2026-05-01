import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Chip } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: "Fiche contact" };
}

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

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await requireTenant();
  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, tenantId },
    include: {
      company: { select: { id: true, name: true, status: true } },
      deals: {
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take:    40,
        include: { createdBy: { select: { name: true } } },
      },
      tasks: {
        where:   { status: { not: "DONE" } },
        orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      },
    },
  });

  if (!contact) notFound();

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");

  const infoFields: { label: string; value: string | null }[] = [
    { label: "Email",        value: contact.email ?? null },
    { label: "Téléphone",    value: contact.phone ?? null },
    { label: "Poste",        value: contact.jobTitle ?? null },
    { label: "LinkedIn",     value: contact.linkedin ?? null },
    { label: "Contact principal", value: contact.isPrimary ? "Oui" : null },
    { label: "Dirigeant",    value: contact.isExecutive ? "Oui" : null },
    { label: "Opt-out",      value: contact.optOut ? "Oui (exclu prospection)" : null },
    {
      label: "Ajouté le",
      value: contact.createdAt.toLocaleDateString("fr-FR"),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title={fullName}
        subtitle={[contact.jobTitle, contact.company?.name].filter(Boolean).join(" · ")}
        breadcrumbs={[
          { label: "Ventes" },
          { label: "Contacts", href: "/contacts" },
          { label: fullName },
        ]}
      />

      {/* Summary strip */}
      <div className="bg-surface border-b border-border px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Avatar name={fullName || "?"} seed={contact.id} size={36} />
          <div>
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-[13px] text-teal hover:underline font-semibold"
              >
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <div className="text-[12px] text-text-3 font-mono">{contact.phone}</div>
            )}
          </div>
        </div>
        {contact.company && (
          <Link
            href={`/comptes/${contact.company.id}`}
            className="text-[12px] text-navy font-semibold hover:underline flex items-center gap-1"
          >
            🏢 {contact.company.name}
          </Link>
        )}
        {contact.isPrimary && <Chip color="teal">Contact principal</Chip>}
        {contact.isExecutive && <Chip color="gold">Dirigeant</Chip>}
        {contact.optOut && <Chip color="red">Opt-out</Chip>}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">

          {/* Left col: infos */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-[11px] font-bold text-text-3 uppercase tracking-wider">
              Informations
            </h2>
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              {infoFields
                .filter((f) => f.value)
                .map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col px-4 py-3 border-b border-border last:border-b-0 text-[12px]"
                  >
                    <span className="text-text-3 font-medium">{f.label}</span>
                    {f.label === "LinkedIn" ? (
                      <a
                        href={
                          (f.value ?? "").startsWith("http")
                            ? (f.value ?? "")
                            : `https://${f.value}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal hover:underline mt-0.5 truncate"
                      >
                        {f.value}
                      </a>
                    ) : (
                      <span className="text-text-1 font-mono mt-0.5">{f.value}</span>
                    )}
                  </div>
                ))}
            </div>

            {/* Deals */}
            {contact.deals.length > 0 && (
              <>
                <h2 className="text-[11px] font-bold text-text-3 uppercase tracking-wider pt-2">
                  Deals ({contact.deals.length})
                </h2>
                <div className="space-y-2">
                  {contact.deals.map((d) => (
                    <div
                      key={d.id}
                      className="bg-surface rounded-xl border border-border px-4 py-3"
                    >
                      <div className="text-[13px] font-semibold text-navy">{d.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-text-3">{d.stage}</span>
                        <span className="text-[12px] font-mono font-semibold text-text-1">
                          {Number(d.amount).toLocaleString("fr-FR")} {d.currency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right col: activity feed */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[11px] font-bold text-text-3 uppercase tracking-wider">
              Activités ({contact.activities.length})
            </h2>
            {contact.activities.length === 0 ? (
              <div className="text-center py-10 text-text-3 text-[12px]">
                Aucune activité enregistrée pour ce contact.
              </div>
            ) : (
              <div className="space-y-2">
                {contact.activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex gap-3 p-4 bg-surface rounded-xl border border-border"
                  >
                    <div className="text-xl shrink-0 w-7 text-center">
                      {ACTIVITY_ICON[a.type] ?? "•"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-text-1">
                        {a.subject}
                      </div>
                      {a.body && (
                        <div className="text-[12px] text-text-2 mt-0.5 line-clamp-2">
                          {a.body}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-text-3 shrink-0 whitespace-nowrap">
                      {timeAgo(new Date(a.createdAt))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks */}
            {contact.tasks.length > 0 && (
              <>
                <h2 className="text-[11px] font-bold text-text-3 uppercase tracking-wider pt-2">
                  Tâches en cours ({contact.tasks.length})
                </h2>
                <div className="space-y-2">
                  {contact.tasks.map((t) => {
                    const isLate = t.dueAt && new Date(t.dueAt) < new Date();
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border"
                      >
                        <div className="w-4 h-4 rounded border-2 border-border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-text-1">
                            {t.title}
                          </div>
                        </div>
                        {t.dueAt && (
                          <span
                            className={`text-[11px] shrink-0 ${
                              isLate ? "text-lh-red font-semibold" : "text-text-3"
                            }`}
                          >
                            {new Date(t.dueAt).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
