import { Header } from "@/components/layout/Header";
import { Chip } from "@/components/ui/Chip";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

export const metadata = { title: "Activités" };

const TYPE_META: Record<
  string,
  { icon: string; label: string; color: "navy" | "teal" | "gold" | "red" }
> = {
  EMAIL_IN:       { icon: "📥", label: "Email reçu",   color: "navy" },
  EMAIL_OUT:      { icon: "📤", label: "Email envoyé", color: "teal" },
  CALL:           { icon: "📞", label: "Appel",        color: "navy" },
  MEETING:        { icon: "🤝", label: "RDV",          color: "teal" },
  NOTE:           { icon: "📝", label: "Note",         color: "navy" },
  TASK_DONE:      { icon: "✓",  label: "Tâche close",  color: "teal" },
  DEAL_MOVED:     { icon: "→",  label: "Pipeline",     color: "gold" },
  SEQUENCE_SENT:  { icon: "✉",  label: "Séquence",     color: "teal" },
  SIGNAL:         { icon: "📡", label: "Signal",       color: "gold" },
  ENRICHMENT:     { icon: "✨", label: "Enrichissement", color: "navy" },
};

function timeAgo(d: Date) {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60)        return "à l'instant";
  if (sec < 3600)      return `il y a ${Math.floor(sec / 60)} min`;
  if (sec < 86400)     return `il y a ${Math.floor(sec / 3600)} h`;
  if (sec < 86400 * 7) return `il y a ${Math.floor(sec / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default async function ActivitesPage() {
  const { tenantId } = await requireTenant();

  const activities = await prisma.activity.findMany({
    where: { tenantId },
    orderBy: { occurredAt: "desc" },
    include: {
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true } },
      deal:    { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
    take: 200,
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Activités"
        subtitle="Journal des interactions et signaux"
        breadcrumbs={[{ label: "Activité" }, { label: "Activités" }]}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <Chip color="navy">{activities.length} activités récentes</Chip>
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <ul>
            {activities.map((a) => {
              const meta = TYPE_META[a.type] ?? TYPE_META.NOTE;
              const contactName = a.contact
                ? `${a.contact.firstName ?? ""} ${a.contact.lastName}`.trim()
                : null;
              return (
                <li
                  key={a.id}
                  className="px-5 py-4 border-b border-border last:border-b-0 hover:bg-bg/40 transition-colors flex gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-bg border border-border grid place-items-center text-[16px] flex-none">
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-text-1">
                        {a.subject}
                      </span>
                      <Chip color={meta.color}>{meta.label}</Chip>
                    </div>
                    {a.body && (
                      <p className="mt-1 text-[12px] text-text-2 line-clamp-2">
                        {a.body}
                      </p>
                    )}
                    <div className="mt-1.5 text-[11px] text-text-3 flex items-center gap-2 flex-wrap">
                      {a.company?.name && (
                        <span className="font-semibold text-navy">
                          {a.company.name}
                        </span>
                      )}
                      {contactName && <span>· {contactName}</span>}
                      {a.deal?.name && <span>· {a.deal.name}</span>}
                    </div>
                  </div>
                  <div className="text-[11px] text-text-3 flex-none">
                    {timeAgo(a.occurredAt)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
