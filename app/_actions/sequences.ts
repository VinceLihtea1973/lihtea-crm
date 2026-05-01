"use server";

import { z }              from "zod";
import { prisma }         from "@/lib/prisma";
import { requireTenant }  from "@/lib/tenant";
import { revalidatePath } from "next/cache";

// ─── Créer une séquence ───────────────────────────────────────────

const CreateSequenceSchema = z.object({
  name:        z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  fromName:    z.string().max(80).optional(),
});

export async function createSequenceAction(raw: z.input<typeof CreateSequenceSchema>) {
  const { tenantId, userId } = await requireTenant();
  const data = CreateSequenceSchema.parse(raw);
  const seq = await prisma.sequence.create({
    data: { tenantId, ownerId: userId, ...data },
  });
  revalidatePath("/sequences");
  return { ok: true as const, sequenceId: seq.id };
}

// ─── Mettre à jour une séquence ───────────────────────────────────

const UpdateSequenceSchema = z.object({
  sequenceId:  z.string().cuid(),
  name:        z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  fromName:    z.string().max(80).optional(),
  status:      z.enum(["DRAFT","ACTIVE","PAUSED","ARCHIVED"]).optional(),
});

export async function updateSequenceAction(raw: z.input<typeof UpdateSequenceSchema>) {
  const { tenantId } = await requireTenant();
  const { sequenceId, ...data } = UpdateSequenceSchema.parse(raw);
  await prisma.sequence.updateMany({ where: { id: sequenceId, tenantId }, data });
  revalidatePath("/sequences");
  return { ok: true as const };
}

// ─── Supprimer une séquence ───────────────────────────────────────

export async function deleteSequenceAction(sequenceId: string) {
  const { tenantId } = await requireTenant();
  await prisma.sequence.deleteMany({ where: { id: sequenceId, tenantId } });
  revalidatePath("/sequences");
  return { ok: true as const };
}

// ─── Ajouter une étape ────────────────────────────────────────────

const AddStepSchema = z.object({
  sequenceId:   z.string().cuid(),
  subject:      z.string().min(1).max(200),
  bodyMarkdown: z.string().min(1),
  delayDays:    z.number().int().min(0).max(90).default(0),
});

export async function addSequenceStepAction(raw: z.input<typeof AddStepSchema>) {
  const { tenantId } = await requireTenant();
  const data = AddStepSchema.parse(raw);

  const seq = await prisma.sequence.findFirst({
    where:   { id: data.sequenceId, tenantId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!seq) return { ok: false as const, error: "Séquence introuvable" };

  const maxOrder = seq.steps.length > 0 ? Math.max(...seq.steps.map((s) => s.order)) : -1;

  const step = await prisma.sequenceStep.create({
    data: {
      sequenceId:   data.sequenceId,
      order:        maxOrder + 1,
      type:         "EMAIL",
      delayDays:    data.delayDays,
      subject:      data.subject,
      bodyMarkdown: data.bodyMarkdown,
    },
  });
  revalidatePath(`/sequences/${data.sequenceId}`);
  return { ok: true as const, stepId: step.id };
}

// ─── Modifier une étape ───────────────────────────────────────────

const UpdateStepSchema = z.object({
  stepId:       z.string().cuid(),
  subject:      z.string().min(1).max(200).optional(),
  bodyMarkdown: z.string().min(1).optional(),
  delayDays:    z.number().int().min(0).max(90).optional(),
});

export async function updateSequenceStepAction(raw: z.input<typeof UpdateStepSchema>) {
  const { stepId, ...data } = UpdateStepSchema.parse(raw);
  const step = await prisma.sequenceStep.findUnique({ where: { id: stepId }, select: { sequenceId: true } });
  if (!step) return { ok: false as const, error: "Étape introuvable" };
  await prisma.sequenceStep.update({ where: { id: stepId }, data });
  revalidatePath(`/sequences/${step.sequenceId}`);
  return { ok: true as const };
}

// ─── Supprimer une étape ──────────────────────────────────────────

export async function deleteSequenceStepAction(stepId: string) {
  const step = await prisma.sequenceStep.findUnique({ where: { id: stepId }, select: { sequenceId: true } });
  if (!step) return { ok: false as const, error: "Étape introuvable" };
  await prisma.sequenceStep.delete({ where: { id: stepId } });
  revalidatePath(`/sequences/${step.sequenceId}`);
  return { ok: true as const };
}

// ─── Inscrire un contact ─────────────────────────────────────────

export async function enrollContactAction(raw: { sequenceId: string; contactId: string }) {
  const { tenantId } = await requireTenant();
  const seq = await prisma.sequence.findFirst({ where: { id: raw.sequenceId, tenantId }, include: { steps: { orderBy: { order: "asc" }, take: 1 } } });
  if (!seq) return { ok: false as const, error: "Séquence introuvable" };
  if (seq.steps.length === 0) return { ok: false as const, error: "La séquence n'a pas d'étapes" };

  await prisma.sequenceEnrollment.upsert({
    where:  { sequenceId_contactId: { sequenceId: raw.sequenceId, contactId: raw.contactId } },
    create: { sequenceId: raw.sequenceId, contactId: raw.contactId, status: "ACTIVE", nextSendAt: new Date() },
    update: { status: "ACTIVE", currentStepOrder: 0, nextSendAt: new Date(), completedAt: null },
  });
  revalidatePath(`/sequences/${raw.sequenceId}`);
  return { ok: true as const };
}

// ─── Retirer un contact ───────────────────────────────────────────

export async function unenrollContactAction(enrollmentId: string) {
  await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data:  { status: "REMOVED" },
  });
  return { ok: true as const };
}
