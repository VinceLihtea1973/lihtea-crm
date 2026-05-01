"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import {
  searchEntreprises,
  fetchBodaccForSirens,
  fetchBodaccBySiren,
  type DatagouvCompany,
  type BodaccSignal,
} from "@/lib/datagouv";
import { calculateIcp } from "@/lib/icp";
import { CompanySource } from "@prisma/client";

// ─── Recherche entreprises ────────────────────────────────────────

const SearchSchema = z.object({
  query:    z.string().trim().min(1).max(120),
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type DatagouvSearchResult = {
  total:   number;
  results: (DatagouvCompany & {
    icpScore:        number;
    alreadyImported: boolean;
    companyId:       string | null;
  })[];
};

export async function searchDatagouvAction(
  raw: z.input<typeof SearchSchema>
): Promise<DatagouvSearchResult> {
  const { tenantId } = await requireTenant();
  const input = SearchSchema.parse(raw);

  const { total, results } = await searchEntreprises(input.query, input.page, input.pageSize);

  const sirens = results.map((r) => r.siren).filter(Boolean);
  const existing = sirens.length
    ? await prisma.company.findMany({
        where: { tenantId, siren: { in: sirens } },
        select: { siren: true, id: true },
      })
    : [];
  const existingMap = new Map(existing.map((c) => [c.siren, c.id]));

  return {
    total,
    results: results.map((r) => {
      const icp = calculateIcp({
        nafBucket:     null,
        headcountBand: r.headcountBand,
        region:        r.region,
        revenueM:      null,
      });
      return {
        ...r,
        icpScore:        icp.score,
        alreadyImported: existingMap.has(r.siren),
        companyId:       existingMap.get(r.siren) ?? null,
      };
    }),
  };
}

// ─── Import depuis Data.gouv ──────────────────────────────────────

const ImportSchema = z.object({
  siren: z.string().regex(/^\d{9}$/),
  siret: z.string().nullable().optional(),
  name:  z.string().min(1),
  legalForm:     z.string().nullable().optional(),
  apeCode:       z.string().nullable().optional(),
  headcountBand: z.string().nullable().optional(),
  region:        z.string().nullable().optional(),
  department:    z.string().nullable().optional(),
  city:          z.string().nullable().optional(),
  postalCode:    z.string().nullable().optional(),
  address:       z.string().nullable().optional(),
});

export async function importDatagouvCompanyAction(
  raw: z.input<typeof ImportSchema>
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Données invalides" };
  const data = parsed.data;

  const icp = calculateIcp({
    nafBucket:     null,
    headcountBand: data.headcountBand ?? null,
    region:        data.region ?? null,
    revenueM:      null,
  });

  const existing = await prisma.company.findFirst({
    where: { tenantId, siren: data.siren },
    select: { id: true },
  });

  const payload = {
    tenantId,
    name:          data.name,
    siren:         data.siren,
    siret:         data.siret ?? null,
    legalForm:     data.legalForm ?? null,
    apeCode:       data.apeCode ?? null,
    headcountBand: data.headcountBand ?? null,
    region:        data.region ?? null,
    department:    data.department ?? null,
    city:          data.city ?? null,
    postalCode:    data.postalCode ?? null,
    address:       data.address ?? null,
    isActive:      true,
    icp:           icp.score,
    source:        CompanySource.MANUAL,
    enrichedAt:    new Date(),
  };

  const company = existing
    ? await prisma.company.update({ where: { id: existing.id }, data: payload })
    : await prisma.company.create({ data: payload });

  revalidatePath("/prospection");
  revalidatePath("/comptes");
  return { ok: true, companyId: company.id };
}

// ─── Signaux BODACC — feed global (toutes les companies du tenant) ─

export type BodaccFeedResult = {
  signals: (BodaccSignal & { companyId: string | null })[];
};

export async function fetchBodaccFeedAction(
  daysBack = 90
): Promise<BodaccFeedResult> {
  const { tenantId } = await requireTenant();

  // Récupère tous les SIRENs du tenant
  const companies = await prisma.company.findMany({
    where:  { tenantId, siren: { not: null } },
    select: { id: true, siren: true },
  });

  if (companies.length === 0) return { signals: [] };

  const sirenToId = new Map(companies.map((c) => [c.siren!, c.id]));
  const sirens    = companies.map((c) => c.siren!);

  const rawSignals = await fetchBodaccForSirens(sirens, daysBack);

  const signals = rawSignals.map((s) => ({
    ...s,
    companyId: sirenToId.get(s.siren) ?? null,
  }));

  return { signals };
}

// ─── Signaux BODACC — fiche entreprise ───────────────────────────

export async function fetchBodaccForCompanyAction(
  companyId: string
): Promise<{ signals: BodaccSignal[] }> {
  const { tenantId } = await requireTenant();

  const company = await prisma.company.findFirst({
    where:  { id: companyId, tenantId },
    select: { siren: true },
  });

  if (!company?.siren) return { signals: [] };

  const signals = await fetchBodaccBySiren(company.siren);
  return { signals };
}

// ─── Enregistrer un signal BODACC comme activité ─────────────────

const LogSignalSchema = z.object({
  companyId: z.string().cuid(),
  subject:   z.string().min(1),
  body:      z.string().optional(),
});

export async function logBodaccSignalAction(
  raw: z.input<typeof LogSignalSchema>
): Promise<{ ok: boolean }> {
  const { tenantId } = await requireTenant();
  const data = LogSignalSchema.parse(raw);

  await prisma.activity.create({
    data: {
      tenantId,
      type:      "SIGNAL",
      subject:   data.subject,
      body:      data.body ?? null,
      companyId: data.companyId,
    },
  });

  revalidatePath(`/comptes/${data.companyId}`);
  revalidatePath("/signaux");
  return { ok: true };
}
