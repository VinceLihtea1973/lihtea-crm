import { notFound }      from "next/navigation";
import { Header }        from "@/components/layout/Header";
import { prisma }        from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { SequenceEditor } from "./SequenceEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seq = await prisma.sequence.findUnique({ where: { id }, select: { name: true } });
  return { title: seq?.name ?? "Séquence" };
}

export default async function SequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { tenantId } = await requireTenant();
  const { id }       = await params;

  const seq = await prisma.sequence.findFirst({
    where:   { id, tenantId },
    include: {
      steps: { orderBy: { order: "asc" } },
      enrollments: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true, companyId: true } },
          sends:   { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!seq) notFound();

  // Check if Gmail is connected for this tenant
  // Wrapped in try/catch in case the migration hasn't been run yet
  let gmailAccount: { email: string } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gmailAccount = await (prisma as any).gmailAccount.findUnique({
      where:  { tenantId },
      select: { email: true },
    });
  } catch {
    // migration pending — gmailAccount stays null
  }

  // Available contacts for enrollment (not already enrolled or removed)
  const enrolledContactIds = seq.enrollments
    .filter((e) => e.status !== "REMOVED")
    .map((e) => e.contactId);

  const contacts = await prisma.contact.findMany({
    where:   { tenantId, email: { not: null } },
    orderBy: [{ lastName: "asc" }],
    select:  { id: true, firstName: true, lastName: true, email: true, companyId: true },
  });

  const serialized = {
    id:          seq.id,
    name:        seq.name,
    description: seq.description ?? null,
    status:      seq.status as "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED",
    fromName:    seq.fromName ?? null,
    steps: seq.steps.map((s) => ({
      id:           s.id,
      order:        s.order,
      type:         s.type as "EMAIL" | "LINKEDIN" | "CALL",
      delayDays:    s.delayDays,
      subject:      s.subject ?? "",
      bodyMarkdown: s.bodyMarkdown ?? "",
    })),
    enrollments: seq.enrollments.map((e) => ({
      id:               e.id,
      status:           e.status as "ACTIVE" | "PAUSED" | "COMPLETED" | "REPLIED" | "BOUNCED" | "UNSUBSCRIBED" | "REMOVED",
      currentStepOrder: e.currentStepOrder,
      nextSendAt:       e.nextSendAt?.toISOString() ?? null,
      completedAt:      e.completedAt?.toISOString() ?? null,
      contact: {
        id:        e.contact.id,
        firstName: e.contact.firstName ?? "",
        lastName:  e.contact.lastName,
        email:     e.contact.email ?? "",
        companyId: e.contact.companyId ?? null,
      },
      lastSentAt: e.sends[0]?.createdAt ? new Date(e.sends[0].createdAt).toISOString() : null,
    })),
    gmailEmail:       gmailAccount?.email ?? null,
    availableContacts: contacts
      .filter((c) => !enrolledContactIds.includes(c.id))
      .map((c) => ({
        id:        c.id,
        firstName: c.firstName ?? "",
        lastName:  c.lastName,
        email:     c.email ?? "",
        companyId: c.companyId ?? null,
      })),
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title={seq.name}
        subtitle={seq.description ?? "Éditeur de séquence"}
        breadcrumbs={[
          { label: "Acquisition" },
          { label: "Séquences", href: "/sequences" },
          { label: seq.name },
        ]}
      />
      <SequenceEditor sequence={serialized} />
    </div>
  );
}
