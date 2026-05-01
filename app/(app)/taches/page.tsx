import { Header } from "@/components/layout/Header";
import { Chip } from "@/components/ui/Chip";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { TachesClient } from "./TachesClient";

export const metadata = { title: "Tâches" };
export const dynamic = "force-dynamic";

export default async function TachesPage() {
  const { tenantId } = await requireTenant();

  const tasks = await prisma.task.findMany({
    where: { tenantId, status: "TODO" },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    include: {
      company:  { select: { id: true, name: true } },
      contact:  { select: { firstName: true, lastName: true } },
      deal:     { select: { id: true, name: true } },
      assignee: { select: { name: true, email: true } },
    },
  });

  const serialized = tasks.map((t) => ({
    id:          t.id,
    title:       t.title,
    description: t.description,
    priority:    t.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
    dueAt:       t.dueAt?.toISOString() ?? null,
    company:     t.company,
    contact:     t.contact,
    deal:        t.deal,
    assignee:    t.assignee,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Tâches"
        subtitle="Todo list priorisée"
        breadcrumbs={[{ label: "Activité" }, { label: "Tâches" }]}
      />
      <TachesClient initialTasks={serialized} />
    </div>
  );
}
