"use server";

import { prisma }        from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getValidAccessToken, sendGmailEmail, markdownToHtml, checkThreadForReplies } from "@/lib/gmail";
import { revalidatePath } from "next/cache";

// ─── Déconnecter le compte Gmail ──────────────────────────────────

export async function disconnectGmailAction(): Promise<{ ok: boolean }> {
  const { tenantId } = await requireTenant();
  await prisma.gmailAccount.deleteMany({ where: { tenantId } });
  revalidatePath("/parametres");
  return { ok: true };
}

// ─── Statut de connexion ──────────────────────────────────────────

export async function getGmailStatusAction(): Promise<{
  connected: boolean;
  email?: string;
}> {
  const { tenantId } = await requireTenant();
  const account = await prisma.gmailAccount.findUnique({
    where:  { tenantId },
    select: { email: true },
  });
  return account ? { connected: true, email: account.email } : { connected: false };
}

// ─── Envoyer l'étape suivante d'un enrollment ────────────────────

export async function sendNextSequenceStepAction(
  enrollmentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { tenantId } = await requireTenant();

  // Charge l'enrollment avec toutes les données nécessaires
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where:   { id: enrollmentId },
    include: {
      contact:  true,
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
      sends:    { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!enrollment) return { ok: false, error: "Enrollment introuvable" };
  if (enrollment.status !== "ACTIVE") return { ok: false, error: "Enrollment non actif" };

  // Récupère le compte Gmail du tenant
  const gmailAccount = await prisma.gmailAccount.findUnique({ where: { tenantId } });
  if (!gmailAccount) return { ok: false, error: "Aucun compte Gmail connecté" };

  // Détermine l'étape à envoyer
  const nextOrder = enrollment.currentStepOrder;
  const step = enrollment.sequence.steps.find((s) => s.order === nextOrder);
  if (!step) return { ok: false, error: "Aucune étape suivante" };
  if (!step.subject || !step.bodyMarkdown) return { ok: false, error: "Étape incomplète (sujet ou corps manquant)" };
  if (!enrollment.contact.email) return { ok: false, error: "Contact sans email" };

  // Variables de personnalisation
  const vars: Record<string, string> = {
    firstName:   enrollment.contact.firstName ?? enrollment.contact.lastName,
    lastName:    enrollment.contact.lastName,
    email:       enrollment.contact.email,
  };

  // Sujet personnalisé
  const subject = step.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

  // Nom affiché = fromName de la séquence ou email du compte Gmail
  const fromNameDisplay = enrollment.sequence.fromName ?? gmailAccount.email.split("@")[0];
  const html = markdownToHtml(step.bodyMarkdown, vars, {
    senderName:  fromNameDisplay,
    senderEmail: gmailAccount.email,
  });

  // Refresh token si nécessaire
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(gmailAccount);
    // Met à jour le token en base si refreshé
    if (accessToken !== gmailAccount.accessToken) {
      await prisma.gmailAccount.update({
        where: { tenantId },
        data:  { accessToken, expiresAt: new Date(Date.now() + 3500 * 1000) },
      });
    }
  } catch (e) {
    return { ok: false, error: "Impossible de rafraîchir le token Gmail" };
  }

  // Thread ID du dernier envoi (pour garder le fil de conversation)
  const lastSend = enrollment.sends[0];
  const threadId = lastSend?.gmailThreadId ?? undefined;

  // Envoi
  try {
    const { messageId, threadId: newThreadId } = await sendGmailEmail({
      accessToken,
      from:    `${enrollment.sequence.fromName ?? "Lihtea"} <${gmailAccount.email}>`,
      to:      enrollment.contact.email,
      subject,
      html,
      threadId,
    });

    // Enregistre le send
    await prisma.sequenceSend.create({
      data: {
        enrollmentId,
        stepId:        step.id,
        gmailMessageId: messageId,
        gmailThreadId:  newThreadId,
        sentAt:         new Date(),
      },
    });

    // Avance l'enrollment à l'étape suivante
    const nextStep = enrollment.sequence.steps.find((s) => s.order === nextOrder + 1);
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStepOrder: nextOrder + 1,
        status:           nextStep ? "ACTIVE" : "COMPLETED",
        completedAt:      nextStep ? null : new Date(),
        nextSendAt:       nextStep
          ? new Date(Date.now() + nextStep.delayDays * 86400000)
          : null,
      },
    });

    // Log activité
    await prisma.activity.create({
      data: {
        tenantId,
        type:      "SEQUENCE_SENT",
        subject:   `Séquence : ${subject}`,
        companyId: enrollment.contact.companyId ?? undefined,
        contactId: enrollment.contact.id,
      },
    });

    revalidatePath("/sequences");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'envoi Gmail" };
  }
}

// ─── Vérifier les réponses pour TOUS les enrollments actifs ──────

export async function checkAllRepliesAction(): Promise<{
  ok: boolean; found: number; checked: number;
}> {
  const { tenantId } = await requireTenant();

  const gmailAccount = await prisma.gmailAccount.findUnique({ where: { tenantId } });
  if (!gmailAccount) return { ok: false, found: 0, checked: 0 };

  // Tous les enrollments ACTIVE qui ont au moins un send avec un threadId
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      sequence: { tenantId },
      status:   "ACTIVE",
      sends: { some: { gmailThreadId: { not: null }, repliedAt: null } },
    },
    include: {
      sends:   { where: { gmailThreadId: { not: null }, repliedAt: null } },
      contact: true,
    },
  });

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(gmailAccount);
  } catch {
    return { ok: false, found: 0, checked: enrollments.length };
  }

  let found = 0;

  for (const enrollment of enrollments) {
    for (const send of enrollment.sends) {
      if (!send.gmailThreadId) continue;

      const replies = await checkThreadForReplies(accessToken, send.gmailThreadId, gmailAccount.email);
      if (replies.length > 0) {
        await prisma.sequenceSend.update({
          where: { id: send.id },
          data:  { repliedAt: replies[0].date },
        });
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data:  { status: "REPLIED" },
        });
        await prisma.activity.create({
          data: {
            tenantId,
            type:      "EMAIL_IN",
            subject:   `Réponse séquence reçue de ${enrollment.contact.firstName ?? ""} ${enrollment.contact.lastName}`,
            contactId: enrollment.contact.id,
            companyId: enrollment.contact.companyId ?? undefined,
          },
        });
        found++;
        break; // un enrollment = une réponse suffit
      }
    }
  }

  revalidatePath("/sequences");
  return { ok: true, found, checked: enrollments.length };
}

// ─── Vérifier les réponses pour un enrollment ────────────────────

export async function checkRepliesAction(
  enrollmentId: string
): Promise<{ ok: boolean; replied: boolean }> {
  const { tenantId } = await requireTenant();

  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where:   { id: enrollmentId },
    include: { sends: true, contact: true },
  });
  if (!enrollment) return { ok: false, replied: false };

  const gmailAccount = await prisma.gmailAccount.findUnique({ where: { tenantId } });
  if (!gmailAccount) return { ok: false, replied: false };

  const accessToken = await getValidAccessToken(gmailAccount);

  for (const send of enrollment.sends) {
    if (!send.gmailThreadId || send.repliedAt) continue;
    const replies = await checkThreadForReplies(accessToken, send.gmailThreadId, gmailAccount.email);
    if (replies.length > 0) {
      // Marque le send comme répondu
      await prisma.sequenceSend.update({
        where: { id: send.id },
        data:  { repliedAt: replies[0].date },
      });
      // Met l'enrollment en REPLIED et stoppe la séquence
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data:  { status: "REPLIED" },
      });
      // Log activité
      await prisma.activity.create({
        data: {
          tenantId,
          type:      "EMAIL_IN",
          subject:   `Réponse séquence reçue de ${enrollment.contact.firstName ?? ""} ${enrollment.contact.lastName}`,
          contactId: enrollment.contact.id,
          companyId: enrollment.contact.companyId ?? undefined,
        },
      });
      return { ok: true, replied: true };
    }
  }

  return { ok: true, replied: false };
}
