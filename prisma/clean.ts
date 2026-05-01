/**
 * Script de nettoyage — supprime toutes les données métier du CRM
 * en conservant le Tenant et les Users (pour ne pas perdre la session).
 *
 * Usage :
 *   set -a && source .env && set +a
 *   npx tsx prisma/clean.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Nettoyage de la base CRM…\n");

  // Ordre de suppression : respecte les FK (enfants avant parents)
  const [
    sends, enrollments, steps, sequences,
    listMembers, lists,
    proposals,
    tasks,
    activities,
    deals,
    contacts,
    companies,
  ] = await Promise.all([
    prisma.sequenceSend.deleteMany({}),
    prisma.sequenceEnrollment.deleteMany({}),
    prisma.sequenceStep.deleteMany({}),
    prisma.sequence.deleteMany({}),
    prisma.listMember.deleteMany({}),
    prisma.list.deleteMany({}),
    prisma.proposal.deleteMany({}),
    prisma.task.deleteMany({}),
    prisma.activity.deleteMany({}),
    prisma.deal.deleteMany({}),
    prisma.contact.deleteMany({}),
    prisma.company.deleteMany({}),
  ]);

  console.log(`  ✓ SequenceSend       : ${sends.count} supprimés`);
  console.log(`  ✓ SequenceEnrollment : ${enrollments.count} supprimés`);
  console.log(`  ✓ SequenceStep       : ${steps.count} supprimés`);
  console.log(`  ✓ Sequence           : ${sequences.count} supprimées`);
  console.log(`  ✓ ListMember         : ${listMembers.count} supprimés`);
  console.log(`  ✓ List               : ${lists.count} supprimées`);
  console.log(`  ✓ Proposal           : ${proposals.count} supprimées`);
  console.log(`  ✓ Task               : ${tasks.count} supprimées`);
  console.log(`  ✓ Activity           : ${activities.count} supprimées`);
  console.log(`  ✓ Deal               : ${deals.count} supprimés`);
  console.log(`  ✓ Contact            : ${contacts.count} supprimés`);
  console.log(`  ✓ Company            : ${companies.count} supprimées`);

  const tenants = await prisma.tenant.count();
  const users   = await prisma.user.count();
  console.log(`\n  ↳ Tenant (conservé) : ${tenants}`);
  console.log(`  ↳ User   (conservé) : ${users}`);

  console.log("\n✅ Base vierge — prête pour les tests E2E.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
