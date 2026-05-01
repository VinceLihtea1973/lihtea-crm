"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ListType, type Prisma } from "@prisma/client";

// ─── Filtres dynamiques (sérialisés dans List.filtersJson) ────────

const FiltersSchema = z.object({
  query:          z.string().trim().optional(),
  apeBuckets:     z.array(z.string()).optional(),
  headcountBands: z.array(z.string()).optional(),
  regions:        z.array(z.string()).optional(),
  icpMin:         z.number().int().min(0).max(100).optional(),
  revenueMMin:    z.number().min(0).optional(),
  revenueMMax:    z.number().min(0).optional(),
  statuses:       z.array(z.enum(["PROSPECT", "LEAD", "CLIENT", "LOST"])).optional(),
});
export type ListFilters = z.infer<typeof FiltersSchema>;

const CreateSchema = z.object({
  name:        z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional(),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#14b8a6"),
  type:        z.enum(["STATIC", "DYNAMIC"]).default("DYNAMIC"),
  filters:     FiltersSchema.optional(),
});

// ─── Build du `where` Prisma à partir des filtres ─────────────────

function buildWhere(tenantId: string, f: ListFilters | null | undefined): Prisma.CompanyWhereInput {
  const where: Prisma.CompanyWhereInput = { tenantId };
  if (!f) return where;
  if (f.query) {
    where.OR = [
      { name: { contains: f.query, mode: "insensitive" } },
      { siren: { contains: f.query } },
    ];
  }
  if (f.apeBuckets?.length)     where.nafBucket     = { in: f.apeBuckets };
  if (f.headcountBands?.length) where.headcountBand = { in: f.headcountBands };
  if (f.regions?.length)        where.region        = { in: f.regions };
  if (f.statuses?.length)       where.status        = { in: f.statuses };
  if (typeof f.icpMin === "number") where.icp = { gte: f.icpMin };
  if (typeof f.revenueMMin === "number" || typeof f.revenueMMax === "number") {
    where.revenueM = {
      ...(typeof f.revenueMMin === "number" ? { gte: f.revenueMMin } : {}),
      ...(typeof f.revenueMMax === "number" ? { lte: f.revenueMMax } : {}),
    };
  }
  return where;
}

// ─── Création ─────────────────────────────────────────────────────

export async function createListAction(
  raw: z.input<typeof CreateSchema>
): Promise<{ ok: true; listId: string } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Filtres invalides" };
  }
  const data = parsed.data;

  const list = await prisma.list.create({
    data: {
      tenantId,
      ownerId:     userId,
      name:        data.name,
      description: data.description ?? null,
      color:       data.color,
      type:        data.type as ListType,
      filtersJson: (data.filters ?? null) as Prisma.InputJsonValue,
    },
  });

  // Snapshot initial des membres pour les listes dynamiques
  if (data.type === "DYNAMIC" && data.filters) {
    const eligible = await prisma.company.findMany({
      where: buildWhere(tenantId, data.filters),
      select: { id: true },
    });
    if (eligible.length) {
      await prisma.listMember.createMany({
        data: eligible.map((c) => ({ listId: list.id, companyId: c.id })),
        skipDuplicates: true,
      });
    }
    await prisma.list.update({
      where: { id: list.id },
      data:  { lastRefreshedAt: new Date() },
    });
  }

  revalidatePath("/listes");
  return { ok: true, listId: list.id };
}

// ─── Refresh d'une liste DYNAMIC ──────────────────────────────────

export async function refreshListAction(
  listId: string
): Promise<{ ok: true; total: number } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const list = await prisma.list.findFirst({
    where: { id: listId, tenantId },
  });
  if (!list)               return { ok: false, error: "Liste introuvable" };
  if (list.type !== "DYNAMIC") return { ok: false, error: "Cette liste est statique — modifier ses membres manuellement" };

  const filters = (list.filtersJson ?? null) as ListFilters | null;
  const eligible = await prisma.company.findMany({
    where: buildWhere(tenantId, filters),
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.listMember.deleteMany({ where: { listId } }),
    ...(eligible.length
      ? [prisma.listMember.createMany({
          data: eligible.map((c) => ({ listId, companyId: c.id })),
          skipDuplicates: true,
        })]
      : []),
    prisma.list.update({
      where: { id: listId },
      data:  { lastRefreshedAt: new Date() },
    }),
  ]);

  revalidatePath("/listes");
  revalidatePath(`/listes/${listId}`);
  return { ok: true, total: eligible.length };
}

// ─── Ajout / retrait manuel ───────────────────────────────────────

export async function addCompanyToListAction(
  listId: string,
  companyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const [list, company] = await Promise.all([
    prisma.list.findFirst({ where: { id: listId, tenantId } }),
    prisma.company.findFirst({ where: { id: companyId, tenantId } }),
  ]);
  if (!list)    return { ok: false, error: "Liste introuvable" };
  if (!company) return { ok: false, error: "Compte introuvable" };

  await prisma.listMember.upsert({
    where:  { listId_companyId: { listId, companyId } },
    update: {},
    create: { listId, companyId },
  });
  revalidatePath(`/listes/${listId}`);
  return { ok: true };
}

export async function removeCompanyFromListAction(
  listId: string,
  companyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const list = await prisma.list.findFirst({ where: { id: listId, tenantId } });
  if (!list) return { ok: false, error: "Liste introuvable" };

  await prisma.listMember.deleteMany({ where: { listId, companyId } });
  revalidatePath(`/listes/${listId}`);
  return { ok: true };
}

// ─── Suppression d'une liste ─────────────────────────────────────

export async function deleteListAction(
  listId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();
  const list = await prisma.list.findFirst({ where: { id: listId, tenantId } });
  if (!list) return { ok: false, error: "Liste introuvable" };
  await prisma.list.delete({ where: { id: listId } });
  revalidatePath("/listes");
  return { ok: true };
}
