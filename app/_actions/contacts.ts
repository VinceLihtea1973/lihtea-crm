"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

// ─── Création contact ─────────────────────────────────────────────

const CreateSchema = z.object({
  companyId:  z.string().min(1),
  firstName:  z.string().trim().max(100).nullable().optional(),
  lastName:   z.string().trim().min(1).max(100),
  jobTitle:   z.string().trim().max(150).nullable().optional(),
  email:      z.string().trim().email().nullable().optional().or(z.literal("")),
  phone:      z.string().trim().max(30).nullable().optional(),
  linkedin:   z.string().trim().max(300).nullable().optional(),
  isPrimary:  z.boolean().default(false),
  isExecutive:z.boolean().default(false),
});

export async function createContactAction(
  raw: z.input<typeof CreateSchema>
): Promise<{ ok: true; contactId: string } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const data = parsed.data;

  const company = await prisma.company.findFirst({
    where: { id: data.companyId, tenantId },
    select: { id: true },
  });
  if (!company) return { ok: false, error: "Compte introuvable" };

  // Si on marque comme principal, on retire l'ancien principal
  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { companyId: data.companyId, isPrimary: true },
      data:  { isPrimary: false },
    });
  }

  const contact = await prisma.contact.create({
    data: {
      tenantId,
      companyId:   data.companyId,
      firstName:   data.firstName || null,
      lastName:    data.lastName,
      jobTitle:    data.jobTitle || null,
      email:       data.email    || null,
      phone:       data.phone    || null,
      linkedin:    data.linkedin || null,
      isPrimary:   data.isPrimary,
      isExecutive: data.isExecutive,
    },
  });

  revalidatePath(`/comptes/${data.companyId}`);
  revalidatePath("/contacts");
  return { ok: true, contactId: contact.id };
}

// ─── Mise à jour contact ──────────────────────────────────────────

const UpdateSchema = z.object({
  contactId:  z.string().min(1),
  firstName:  z.string().trim().max(100).nullable().optional(),
  lastName:   z.string().trim().min(1).max(100).optional(),
  jobTitle:   z.string().trim().max(150).nullable().optional(),
  email:      z.string().trim().email().nullable().optional().or(z.literal("")),
  phone:      z.string().trim().max(30).nullable().optional(),
  linkedin:   z.string().trim().max(300).nullable().optional(),
  isPrimary:  z.boolean().optional(),
  isExecutive:z.boolean().optional(),
  optOut:     z.boolean().optional(),
});

export async function updateContactAction(
  raw: z.input<typeof UpdateSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = UpdateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const { contactId, ...fields } = parsed.data;

  const contact = await prisma.contact.findFirst({
    where:  { id: contactId, tenantId },
    select: { id: true, companyId: true },
  });
  if (!contact) return { ok: false, error: "Contact introuvable" };

  // Si on marque comme principal, on retire l'ancien
  if (fields.isPrimary && contact.companyId) {
    await prisma.contact.updateMany({
      where: { companyId: contact.companyId, isPrimary: true, NOT: { id: contactId } },
      data:  { isPrimary: false },
    });
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(fields.firstName   !== undefined ? { firstName:   fields.firstName   || null } : {}),
      ...(fields.lastName    !== undefined ? { lastName:    fields.lastName }            : {}),
      ...(fields.jobTitle    !== undefined ? { jobTitle:    fields.jobTitle    || null } : {}),
      ...(fields.email       !== undefined ? { email:       fields.email       || null } : {}),
      ...(fields.phone       !== undefined ? { phone:       fields.phone       || null } : {}),
      ...(fields.linkedin    !== undefined ? { linkedin:    fields.linkedin    || null } : {}),
      ...(fields.isPrimary   !== undefined ? { isPrimary:   fields.isPrimary   }        : {}),
      ...(fields.isExecutive !== undefined ? { isExecutive: fields.isExecutive }        : {}),
      ...(fields.optOut      !== undefined ? { optOut:      fields.optOut      }        : {}),
    },
  });

  if (contact.companyId) revalidatePath(`/comptes/${contact.companyId}`);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { ok: true };
}

// ─── Suppression contact ──────────────────────────────────────────

export async function deleteContactAction(
  contactId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();

  const contact = await prisma.contact.findFirst({
    where:  { id: contactId, tenantId },
    select: { id: true, companyId: true },
  });
  if (!contact) return { ok: false, error: "Contact introuvable" };

  await prisma.contact.delete({ where: { id: contactId } });

  if (contact.companyId) revalidatePath(`/comptes/${contact.companyId}`);
  revalidatePath("/contacts");
  return { ok: true };
}
