"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ActivityType } from "@prisma/client";

const TypeSchema = z.enum([
  "EMAIL_IN", "EMAIL_OUT", "CALL", "MEETING", "NOTE",
]);

const AddSchema = z.object({
  type:      TypeSchema,
  subject:   z.string().trim().min(1).max(160),
  body:      z.string().trim().max(4000).optional(),
  companyId: z.string().min(1).optional(),
  contactId: z.string().min(1).optional(),
  dealId:    z.string().min(1).optional(),
});

export async function addActivityAction(
  raw: z.input<typeof AddSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const parsed = AddSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const d = parsed.data;
  if (!d.companyId && !d.contactId && !d.dealId) {
    return { ok: false, error: "Au moins une entité (compte, contact ou deal) doit être liée" };
  }

  await prisma.activity.create({
    data: {
      tenantId,
      type:        d.type as ActivityType,
      subject:     d.subject,
      body:        d.body ?? null,
      createdById: userId,
      companyId:   d.companyId ?? null,
      contactId:   d.contactId ?? null,
      dealId:      d.dealId ?? null,
    },
  });

  revalidatePath("/activites");
  if (d.companyId) revalidatePath(`/comptes/${d.companyId}`);
  return { ok: true };
}
