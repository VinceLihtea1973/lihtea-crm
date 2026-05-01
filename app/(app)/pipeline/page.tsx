import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Header } from "@/components/layout/Header";
import { KanbanBoard } from "./KanbanBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const { tenantId } = await requireTenant();

  const deals = await prisma.deal.findMany({
    where:   { tenantId },
    orderBy: [{ kanbanOrder: "asc" }, { createdAt: "desc" }],
    include: {
      company:        { select: { id: true, name: true } },
      primaryContact: { select: { firstName: true, lastName: true } },
      owner:          { select: { name: true } },
    },
  });

  // Serialize Decimal → number and Date → ISO string for client component
  const serialized = deals.map((d) => ({
    id:              d.id,
    name:            d.name,
    amount:          Number(d.amount),
    currency:        d.currency,
    probability:     d.probability,
    stage:           d.stage as
      | "QUALIFICATION"
      | "DEMO"
      | "PROPOSAL"
      | "NEGOTIATION"
      | "WON"
      | "LOST",
    expectedCloseAt: d.expectedCloseAt?.toISOString() ?? null,
    company:         d.company,
    primaryContact:  d.primaryContact,
    owner:           d.owner,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Pipeline"
        subtitle="Vue kanban des opportunités commerciales"
        breadcrumbs={[{ label: "Ventes" }, { label: "Pipeline" }]}
      />
      <KanbanBoard initialDeals={serialized} />
    </div>
  );
}
