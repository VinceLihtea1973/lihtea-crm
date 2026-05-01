"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { searchSirene, type SireneCompany } from "@/lib/insee";
import { calculateIcp } from "@/lib/icp";
import { CompanySource } from "@prisma/client";

// ─── Schemas Zod ──────────────────────────────────────────────────

const SearchSchema = z.object({
  query:          z.string().trim().max(120).optional(),
  apeBuckets:     z.array(z.string()).optional(),
  apeCodes:       z.array(z.string()).optional(),
  headcountBands: z.array(z.string()).optional(),
  regions:        z.array(z.string()).optional(),
  page:           z.number().int().min(1).max(50).default(1),
  pageSize:       z.number().int().min(1).max(100).default(20),
});

const ImportSchema = z.object({
  siren:         z.string().regex(/^\d{9}$/, "SIREN à 9 chiffres requis"),
  siret:         z.string().regex(/^\d{14}$/).optional(),
  name:          z.string().min(1),
  apeCode:       z.string().nullable().optional(),
  nafBucket:     z.string().nullable().optional(),
  legalForm:     z.string().nullable().optional(),
  legalFormCode: z.string().nullable().optional(),
  headcountBand: z.string().nullable().optional(),
  region:        z.string().nullable().optional(),
  department:    z.string().nullable().optional(),
  city:          z.string().nullable().optional(),
  postalCode:    z.string().nullable().optional(),
  address:       z.string().nullable().optional(),
  creationDate:  z.coerce.date().nullable().optional(),
});

// ─── Search (lecture seule, pas de side-effect) ───────────────────

export type SearchResult = {
  total:    number;
  page:     number;
  pageSize: number;
  source:   "INSEE" | "MOCK";
  results:  (SireneCompany & {
    icpScore: number;
    icpBand:  "HOT" | "WARM" | "COLD";
    alreadyImported: boolean;
    companyId:       string | null;
  })[];
};

export async function searchSireneAction(
  raw: z.input<typeof SearchSchema>
): Promise<SearchResult> {
  const { tenantId } = await requireTenant();
  const input = SearchSchema.parse(raw);
  const sirene = await searchSirene(input);

  // Marque les SIREN déjà présents en base pour ce tenant
  const sirens = sirene.results.map((r) => r.siren).filter(Boolean);
  const existing = sirens.length
    ? await prisma.company.findMany({
        where: { tenantId, siren: { in: sirens } },
        select: { siren: true, id: true },
      })
    : [];
  const existingMap = new Map(existing.map((c) => [c.siren, c.id]));

  const results = sirene.results.map((r) => {
    const icp = calculateIcp({
      nafBucket:     r.nafBucket,
      headcountBand: r.headcountBand,
      region:        r.region,
      revenueM:      null,
    });
    return {
      ...r,
      icpScore:        icp.score,
      icpBand:         icp.band,
      alreadyImported: existingMap.has(r.siren),
      companyId:       existingMap.get(r.siren) ?? null,
    };
  });

  return {
    total:    sirene.total,
    page:     sirene.page,
    pageSize: sirene.pageSize,
    source:   sirene.source,
    results,
  };
}

// ─── Import en base (création / upsert Company) ──────────────────

export async function importSireneCompanyAction(
  raw: z.input<typeof ImportSchema>
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const icp = calculateIcp({
    nafBucket:     data.nafBucket ?? null,
    headcountBand: data.headcountBand ?? null,
    region:        data.region ?? null,
    revenueM:      null,
  });

  // Upsert par (tenantId, siren) — si déjà présent on enrichit.
  const existing = await prisma.company.findFirst({
    where: { tenantId, siren: data.siren },
    select: { id: true },
  });

  const payload = {
    tenantId,
    name:          data.name,
    siren:         data.siren,
    siret:         data.siret ?? null,
    apeCode:       data.apeCode ?? null,
    nafBucket:     data.nafBucket ?? null,
    legalForm:     data.legalForm ?? null,
    legalFormCode: data.legalFormCode ?? null,
    headcountBand: data.headcountBand ?? null,
    region:        data.region ?? null,
    department:    data.department ?? null,
    city:          data.city ?? null,
    postalCode:    data.postalCode ?? null,
    address:       data.address ?? null,
    creationDate:  data.creationDate ?? null,
    isActive:      true,
    icp:           icp.score,
    source:        CompanySource.SIRENE,
    enrichedAt:    new Date(),
  };

  const company = existing
    ? await prisma.company.update({ where: { id: existing.id }, data: payload })
    : await prisma.company.create({ data: payload });

  revalidatePath("/prospection");
  revalidatePath("/comptes");
  return { ok: true, companyId: company.id };
}
