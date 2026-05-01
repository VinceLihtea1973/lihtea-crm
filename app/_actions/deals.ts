"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { ActivityType, DealStage } from "@prisma/client";

const StageSchema = z.enum([
  "QUALIFICATION",
  "DEMO",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

// Probabilité par défaut par stage (modifiable plus tard via TenantSettings)
const DEFAULT_PROBABILITY: Record<DealStage, number> = {
  QUALIFICATION: 20,
  DEMO:          40,
  PROPOSAL:      60,
  NEGOTIATION:   80,
  WON:           100,
  LOST:          0,
};

const CreateSchema = z.object({
  name:             z.string().trim().min(1).max(120),
  companyId:        z.string().min(1),
  primaryContactId: z.string().min(1).optional(),
  amount:           z.number().min(0),
  currency:         z.string().default("EUR"),
  stage:            StageSchema.default("QUALIFICATION"),
  expectedCloseAt:  z.coerce.date().optional(),
});

export async function createDealAction(
  raw: z.input<typeof CreateSchema>
): Promise<{ ok: true; dealId: string } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  // Vérifie que la company appartient bien au tenant
  const company = await prisma.company.findFirst({
    where:  { id: data.companyId, tenantId },
    select: { id: true, status: true },
  });
  if (!company) return { ok: false, error: "Compte introuvable" };

  const deal = await prisma.deal.create({
    data: {
      tenantId,
      companyId:        data.companyId,
      primaryContactId: data.primaryContactId ?? null,
      ownerId:          userId,
      name:             data.name,
      amount:           data.amount,
      currency:         data.currency,
      probability:      DEFAULT_PROBABILITY[data.stage as DealStage],
      stage:            data.stage as DealStage,
      expectedCloseAt:  data.expectedCloseAt ?? null,
    },
  });

  // Si le compte est encore PROSPECT, on le passe automatiquement en LEAD
  if (company.status === "PROSPECT") {
    await prisma.company.update({
      where: { id: company.id },
      data:  { status: "LEAD" },
    });
  }

  // Activité automatique
  await prisma.activity.create({
    data: {
      tenantId,
      type:        ActivityType.DEAL_MOVED,
      subject:     `Deal créé — ${data.name}`,
      body:        `Stage : ${data.stage}, montant ${data.amount} ${data.currency}`,
      createdById: userId,
      companyId:   data.companyId,
      dealId:      deal.id,
    },
  });

  revalidatePath("/pipeline");
  revalidatePath(`/comptes/${data.companyId}`);
  revalidatePath("/activites");
  return { ok: true, dealId: deal.id };
}

const MoveSchema = z.object({
  dealId: z.string().min(1),
  stage:  StageSchema,
});

export async function moveDealStageAction(
  raw: z.input<typeof MoveSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const parsed = MoveSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { dealId, stage } = parsed.data;

  const deal = await prisma.deal.findFirst({
    where:  { id: dealId, tenantId },
    select: { id: true, stage: true, name: true, companyId: true },
  });
  if (!deal)              return { ok: false, error: "Deal introuvable" };
  if (deal.stage === stage) return { ok: true };

  const isClosing = stage === "WON" || stage === "LOST";

  await prisma.$transaction([
    prisma.deal.update({
      where: { id: dealId },
      data: {
        stage:       stage as DealStage,
        probability: DEFAULT_PROBABILITY[stage as DealStage],
        closedAt:    isClosing ? new Date() : null,
      },
    }),
    prisma.activity.create({
      data: {
        tenantId,
        type:        ActivityType.DEAL_MOVED,
        subject:     `${deal.name} — ${deal.stage} → ${stage}`,
        createdById: userId,
        companyId:   deal.companyId,
        dealId,
      },
    }),
    // Si gagné, le compte devient CLIENT
    ...(stage === "WON"
      ? [prisma.company.update({
          where: { id: deal.companyId },
          data:  { status: "CLIENT" },
        })]
      : []),
  ]);

  revalidatePath("/pipeline");
  revalidatePath(`/comptes/${deal.companyId}`);
  revalidatePath("/activites");
  return { ok: true };
}

const CloseLostSchema = z.object({
  dealId: z.string().min(1),
  reason: z.string().trim().max(280),
});

export async function closeDealLostAction(
  raw: z.input<typeof CloseLostSchema>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId, userId } = await requireTenant();
  const parsed = CloseLostSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { dealId, reason } = parsed.data;

  const deal = await prisma.deal.findFirst({
    where:  { id: dealId, tenantId },
    select: { id: true, name: true, companyId: true },
  });
  if (!deal) return { ok: false, error: "Deal introuvable" };

  await prisma.$transaction([
    prisma.deal.update({
      where: { id: dealId },
      data: {
        stage:       "LOST",
        probability: 0,
        closedAt:    new Date(),
        lostReason:  reason,
      },
    }),
    prisma.activity.create({
      data: {
        tenantId,
        type:        ActivityType.DEAL_MOVED,
        subject:     `${deal.name} — Deal perdu`,
        body:        reason,
        createdById: userId,
        companyId:   deal.companyId,
        dealId,
      },
    }),
  ]);

  revalidatePath("/pipeline");
  revalidatePath(`/comptes/${deal.companyId}`);
  return { ok: true };
}
