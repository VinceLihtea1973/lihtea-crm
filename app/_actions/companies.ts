"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { calculateIcp } from "@/lib/icp";
import { CompanyStatus } from "@prisma/client";

const StatusSchema = z.enum(["PROSPECT", "LEAD", "CLIENT", "LOST"]);

export async function updateCompanyStatusAction(
  companyId: string,
  status: z.input<typeof StatusSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = StatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Statut invalide" };

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  if (!company) return { ok: false, error: "Compte introuvable" };

  await prisma.company.update({
    where: { id: companyId },
    data:  { status: parsed.data as CompanyStatus },
  });
  revalidatePath(`/comptes/${companyId}`);
  revalidatePath("/comptes");
  return { ok: true };
}

// ─── Mise à jour des infos compte ────────────────────────────────

const UpdateCompanySchema = z.object({
  companyId:     z.string().min(1),
  name:          z.string().trim().min(1).max(200).optional(),
  website:       z.string().trim().max(300).nullable().optional(),
  description:   z.string().trim().max(2000).nullable().optional(),
  address:       z.string().trim().max(300).nullable().optional(),
  postalCode:    z.string().trim().max(20).nullable().optional(),
  city:          z.string().trim().max(100).nullable().optional(),
  region:        z.string().trim().max(100).nullable().optional(),
  headcountBand: z.string().trim().max(30).nullable().optional(),
  revenueM:      z.number().nullable().optional(),
  nafBucket:     z.string().trim().max(50).nullable().optional(),
  linkedinUrl:   z.string().trim().max(300).nullable().optional(),
});

export async function updateCompanyAction(
  raw: z.input<typeof UpdateCompanySchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = UpdateCompanySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const { companyId, ...fields } = parsed.data;

  const company = await prisma.company.findFirst({
    where:  { id: companyId, tenantId },
    select: { id: true },
  });
  if (!company) return { ok: false, error: "Compte introuvable" };

  await prisma.company.update({
    where: { id: companyId },
    data:  {
      ...(fields.name          !== undefined ? { name: fields.name }                   : {}),
      ...(fields.website       !== undefined ? { website: fields.website }             : {}),
      ...(fields.description   !== undefined ? { description: fields.description }     : {}),
      ...(fields.address       !== undefined ? { address: fields.address }             : {}),
      ...(fields.postalCode    !== undefined ? { postalCode: fields.postalCode }       : {}),
      ...(fields.city          !== undefined ? { city: fields.city }                   : {}),
      ...(fields.region        !== undefined ? { region: fields.region }               : {}),
      ...(fields.headcountBand !== undefined ? { headcountBand: fields.headcountBand } : {}),
      ...(fields.revenueM      !== undefined ? { revenueM: fields.revenueM }           : {}),
      ...(fields.nafBucket     !== undefined ? { nafBucket: fields.nafBucket }         : {}),
      ...(fields.linkedinUrl   !== undefined ? { linkedinUrl: fields.linkedinUrl }     : {}),
    },
  });

  revalidatePath(`/comptes/${companyId}`);
  revalidatePath("/comptes");
  return { ok: true };
}

// ─── Suppression compte ───────────────────────────────────────────

export async function deleteCompanyAction(
  companyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true },
  });
  if (!company) return { ok: false, error: "Compte introuvable" };

  await prisma.company.delete({ where: { id: companyId } });
  revalidatePath("/comptes");
  return { ok: true };
}

// ─── Recalcul ICP ─────────────────────────────────────────────────

const RecomputeSchema = z.object({
  companyId: z.string().min(1),
});

export async function recomputeIcpAction(
  raw: z.input<typeof RecomputeSchema>
): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = RecomputeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Données invalides" };

  const c = await prisma.company.findFirst({
    where:  { id: parsed.data.companyId, tenantId },
    select: { id: true, nafBucket: true, headcountBand: true, region: true, revenueM: true },
  });
  if (!c) return { ok: false, error: "Compte introuvable" };

  const icp = calculateIcp({
    nafBucket:     c.nafBucket,
    headcountBand: c.headcountBand,
    region:        c.region,
    revenueM:      c.revenueM,
  });

  await prisma.company.update({
    where: { id: c.id },
    data:  { icp: icp.score },
  });
  revalidatePath(`/comptes/${c.id}`);
  return { ok: true, score: icp.score };
}
