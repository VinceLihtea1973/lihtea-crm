import { Header }           from "@/components/layout/Header";
import { prisma }           from "@/lib/prisma";
import { requireTenant }   from "@/lib/tenant";
import { SequencesClient } from "./SequencesClient";

export const metadata = { title: "Séquences" };
export const dynamic  = "force-dynamic";

export default async function SequencesPage() {
  const { tenantId } = await requireTenant();
  const now = new Date();

  // ── Séquences ──────────────────────────────────────────────────
  const sequences = await prisma.sequence.findMany({
    where:   { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
  });

  // ── File d'attente (due aujourd'hui) ───────────────────────────
  const queue = await prisma.sequenceEnrollment.findMany({
    where: {
      sequence: { tenantId },
      status:   "ACTIVE",
      nextSendAt: { lte: now },
    },
    include: {
      contact:  { select: { id: true, firstName: true, lastName: true, email: true } },
      sequence: { select: { id: true, name: true, steps: { orderBy: { order: "asc" } } } },
    },
    orderBy: { nextSendAt: "asc" },
  });

  // ── Réponses reçues ────────────────────────────────────────────
  const replies = await prisma.sequenceEnrollment.findMany({
    where: {
      sequence: { tenantId },
      status:   "REPLIED",
    },
    include: {
      contact:  { select: { id: true, firstName: true, lastName: true, email: true } },
      sequence: { select: { id: true, name: true } },
      sends:    { where: { repliedAt: { not: null } }, orderBy: { repliedAt: "desc" }, take: 1 },
    },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Séquences"
        subtitle="Campagnes d'emails automatisées"
        breadcrumbs={[{ label: "Acquisition" }, { label: "Séquences" }]}
      />
      <SequencesClient
        sequences={sequences.map((s) => ({
          id:          s.id,
          name:        s.name,
          description: s.description ?? null,
          status:      s.status as "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED",
          fromName:    s.fromName ?? null,
          steps:       s._count.steps,
          enrolled:    s._count.enrollments,
          createdAt:   s.createdAt.toISOString(),
        }))}
        queue={queue.map((e) => ({
          enrollmentId:     e.id,
          contactId:        e.contact.id,
          contactName:      `${e.contact.firstName ?? ""} ${e.contact.lastName}`.trim(),
          contactEmail:     e.contact.email ?? "",
          sequenceId:       e.sequence.id,
          sequenceName:     e.sequence.name,
          currentStepOrder: e.currentStepOrder,
          totalSteps:       e.sequence.steps.length,
          nextSendAt:       e.nextSendAt?.toISOString() ?? null,
        }))}
        replies={replies.map((e) => ({
          enrollmentId: e.id,
          contactId:    e.contact.id,
          contactName:  `${e.contact.firstName ?? ""} ${e.contact.lastName}`.trim(),
          contactEmail: e.contact.email ?? "",
          sequenceId:   e.sequence.id,
          sequenceName: e.sequence.name,
          repliedAt:    e.sends[0]?.repliedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
