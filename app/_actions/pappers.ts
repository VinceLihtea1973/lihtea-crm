"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { searchByDirector, searchPappers, enrichFromSiren } from "@/lib/pappers";
import { calculateIcp } from "@/lib/icp";
import { CompanySource } from "@prisma/client";

// ─── Recherche par dirigeant ──────────────────────────────────────

const DirectorSearchSchema = z.object({
  name:     z.string().trim().min(2).max(120),
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type DirectorSearchResult = {
  total:   number;
  results: {
    nom:       string;
    prenom:    string | null;
    qualite:   string;
    entreprises: {
      siren:           string;
      nom:             string;
      legalForm:       string | null;
      apeCode:         string | null;
      city:            string | null;
      isActive:        boolean;
      alreadyImported: boolean;
      companyId:       string | null;
    }[];
  }[];
};

export async function searchDirectorAction(
  raw: z.input<typeof DirectorSearchSchema>
): Promise<DirectorSearchResult> {
  const { tenantId } = await requireTenant();
  const input = DirectorSearchSchema.parse(raw);

  const pappers = await searchByDirector(input.name, input.page, input.pageSize);

  // Collecte tous les SIREN pour vérif "déjà importé"
  const allSirens = pappers.results.flatMap((r) => r.entreprises.map((e) => e.siren));
  const existing = allSirens.length
    ? await prisma.company.findMany({
        where: { tenantId, siren: { in: allSirens } },
        select: { siren: true, id: true },
      })
    : [];
  const existingMap = new Map(existing.map((c) => [c.siren, c.id]));

  return {
    total: pappers.total,
    results: pappers.results.map((hit) => ({
      ...hit,
      entreprises: hit.entreprises.map((e) => ({
        ...e,
        alreadyImported: existingMap.has(e.siren),
        companyId:       existingMap.get(e.siren) ?? null,
      })),
    })),
  };
}

// ─── Recherche par raison sociale (via Pappers) ───────────────────

const PappersSearchSchema = z.object({
  query:    z.string().trim().min(1).max(120),
  page:     z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type PappersSearchResult = {
  total:   number;
  results: {
    siren:           string;
    siret:           string | null;
    name:            string;
    legalForm:       string | null;
    apeCode:         string | null;
    headcountBand:   string | null;
    region:          string | null;
    city:            string | null;
    website:         string | null;
    revenueM:        number | null;
    icpScore:        number;
    alreadyImported: boolean;
  }[];
};

export async function searchPappersAction(
  raw: z.input<typeof PappersSearchSchema>
): Promise<PappersSearchResult> {
  const { tenantId } = await requireTenant();
  const input = PappersSearchSchema.parse(raw);

  const pappers = await searchPappers(input.query, input.page, input.pageSize);

  const sirens = pappers.results.map((r) => r.siren);
  const existing = sirens.length
    ? await prisma.company.findMany({
        where: { tenantId, siren: { in: sirens } },
        select: { siren: true },
      })
    : [];
  const existingSet = new Set(existing.map((c) => c.siren));

  return {
    total: pappers.total,
    results: pappers.results.map((r) => {
      const icp = calculateIcp({ nafBucket: null, headcountBand: r.headcountBand, region: r.region, revenueM: r.revenueM });
      return {
        siren:           r.siren,
        siret:           r.siret,
        name:            r.name,
        legalForm:       r.legalForm,
        apeCode:         r.apeCode,
        headcountBand:   r.headcountBand,
        region:          r.region,
        city:            r.city,
        website:         r.website,
        revenueM:        r.revenueM,
        icpScore:        icp.score,
        alreadyImported: existingSet.has(r.siren),
      };
    }),
  };
}

// ─── Import depuis Pappers (upsert Company enrichi) ──────────────

const ImportSirenSchema = z.object({
  siren: z.string().regex(/^\d{9}$/, "SIREN à 9 chiffres"),
});

export async function importPappersCompanyAction(
  raw: z.input<typeof ImportSirenSchema>
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const parsed = ImportSirenSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.data ?? "SIREN invalide" };
  }

  try {
    const p = await enrichFromSiren(parsed.data.siren);
    const icp = calculateIcp({
      nafBucket:     null,
      headcountBand: p.headcountBand,
      region:        p.region,
      revenueM:      p.revenueM,
    });

    const existing = await prisma.company.findFirst({
      where: { tenantId, siren: p.siren },
      select: { id: true },
    });

    const payload = {
      tenantId,
      name:          p.name,
      siren:         p.siren,
      siret:         p.siret,
      legalForm:     p.legalForm,
      apeCode:       p.apeCode,
      headcountBand: p.headcountBand,
      region:        p.region,
      department:    p.department,
      city:          p.city,
      postalCode:    p.postalCode,
      address:       p.address,
      website:       p.website,
      revenueM:      p.revenueM,
      revenueYear:   p.revenueYear,
      creationDate:  p.creationDate,
      isActive:      p.isActive,
      icp:           icp.score,
      source:        CompanySource.PAPPERS,
      enrichedAt:    new Date(),
    };

    const company = existing
      ? await prisma.company.update({ where: { id: existing.id }, data: payload })
      : await prisma.company.create({ data: payload });

    // Upsert les dirigeants en tant que contacts
    for (const d of p.dirigeants) {
      if (!d.nom) continue;
      const existingContact = await prisma.contact.findFirst({
        where: {
          tenantId,
          companyId: company.id,
          lastName:  d.nom,
          firstName: d.prenom ?? undefined,
        },
        select: { id: true },
      });
      if (!existingContact) {
        await prisma.contact.create({
          data: {
            tenantId,
            companyId:   company.id,
            lastName:    d.nom,
            firstName:   d.prenom ?? null,
            jobTitle:    d.qualite ?? null,
            isExecutive: true,
            isPrimary:   d.qualite?.toLowerCase().includes("président") ||
                         d.qualite?.toLowerCase().includes("gérant") ||
                         false,
          },
        });
      }
    }

    revalidatePath("/prospection");
    revalidatePath("/comptes");
    revalidatePath(`/comptes/${company.id}`);
    return { ok: true, companyId: company.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur Pappers" };
  }
}

// ─── Enrichissement d'une Company déjà en base ───────────────────

const EnrichSchema = z.object({
  companyId: z.string().cuid(),
});

export async function enrichCompanyFromPappersAction(
  raw: z.input<typeof EnrichSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const { companyId } = EnrichSchema.parse(raw);

  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId },
    select: { id: true, siren: true, name: true },
  });
  if (!company) return { ok: false, error: "Entreprise introuvable" };
  if (!company.siren) return { ok: false, error: "Pas de SIREN — enrichissement impossible" };

  try {
    const p = await enrichFromSiren(company.siren);
    const icp = calculateIcp({
      nafBucket:     null,
      headcountBand: p.headcountBand,
      region:        p.region,
      revenueM:      p.revenueM,
    });

    await prisma.company.update({
      where: { id: companyId },
      data: {
        website:       p.website ?? undefined,
        revenueM:      p.revenueM ?? undefined,
        revenueYear:   p.revenueYear ?? undefined,
        headcountBand: p.headcountBand ?? undefined,
        legalForm:     p.legalForm ?? undefined,
        apeCode:       p.apeCode ?? undefined,
        address:       p.address ?? undefined,
        city:          p.city ?? undefined,
        postalCode:    p.postalCode ?? undefined,
        region:        p.region ?? undefined,
        department:    p.department ?? undefined,
        icp:           icp.score,
        source:        CompanySource.PAPPERS,
        enrichedAt:    new Date(),
      },
    });

    // Upsert dirigeants
    for (const d of p.dirigeants) {
      if (!d.nom) continue;
      const existingContact = await prisma.contact.findFirst({
        where: { tenantId, companyId, lastName: d.nom },
        select: { id: true },
      });
      if (!existingContact) {
        await prisma.contact.create({
          data: {
            tenantId,
            companyId,
            lastName:    d.nom,
            firstName:   d.prenom ?? null,
            jobTitle:    d.qualite ?? null,
            isExecutive: true,
            isPrimary:   d.qualite?.toLowerCase().includes("président") ||
                         d.qualite?.toLowerCase().includes("gérant") ||
                         false,
          },
        });
      }
    }

    revalidatePath(`/comptes/${companyId}`);
    revalidatePath("/comptes");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur Pappers" };
  }
}
