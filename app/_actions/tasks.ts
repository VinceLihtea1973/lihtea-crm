"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ActivityType, TaskPriority, TaskStatus } from "@prisma/client";

const PrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const CreateSchema = z.object({
  title:       z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  priority:    PrioritySchema.default("NORMAL"),
  dueAt:       z.coerce.date().optional(),
  companyId:   z.string().min(1).optional(),
  contactId:   z.string().min(1).optional(),
  dealId:      z.string().min(1).optional(),
});

export async function createTaskAction(
  raw: z.input<typeof CreateSchema>
): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const d = parsed.data;

  const task = await prisma.task.create({
    data: {
      tenantId,
      title:       d.title,
      description: d.description ?? null,
      priority:    d.priority as TaskPriority,
      status:      TaskStatus.TODO,
      assigneeId:  userId,
      companyId:   d.companyId ?? null,
      contactId:   d.contactId ?? null,
      dealId:      d.dealId ?? null,
      dueAt:       d.dueAt ?? null,
    },
  });

  revalidatePath("/taches");
  if (d.companyId) revalidatePath(`/comptes/${d.companyId}`);
  return { ok: true, taskId: task.id };
}

export async function completeTaskAction(
  taskId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const task = await prisma.task.findFirst({
    where:  { id: taskId, tenantId },
    select: { id: true, title: true, companyId: true, dealId: true, contactId: true },
  });
  if (!task) return { ok: false, error: "Tâche introuvable" };

  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data:  { status: TaskStatus.DONE, completedAt: new Date() },
    }),
    prisma.activity.create({
      data: {
        tenantId,
        type:        ActivityType.TASK_DONE,
        subject:     `✓ ${task.title}`,
        createdById: userId,
        companyId:   task.companyId,
        contactId:   task.contactId,
        dealId:      task.dealId,
      },
    }),
  ]);

  revalidatePath("/taches");
  if (task.companyId) revalidatePath(`/comptes/${task.companyId}`);
  return { ok: true };
}
