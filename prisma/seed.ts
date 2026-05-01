/**
 * Seed Niveau 1 — peuple un tenant Lihtea complet avec :
 *   - 1 admin (OWNER)
 *   - 20 Comptes (Company) + 20 Contacts principaux + 8 contacts secondaires
 *   - 6 Deals couvrant les 6 stages du pipeline
 *   - 10+ Activités (emails loggés, appels, RDV, signaux, deal moved)
 *   - 3 Listes ICP (dont 2 dynamiques + 1 statique)
 *   - 2 Séquences (1 DRAFT + 1 ACTIVE avec étapes)
 *   - 3 Propositions à différents statuts
 *   - 5 Tâches (priorités mixtes)
 *
 * Rejouable (upsert + deleteMany ciblés). Idempotent.
 *
 * Usage : pnpm db:seed
 */
import {
  PrismaClient,
  CompanyStatus,
  CompanySource,
  CategorieEntreprise,
  UserRole,
  DealStage,
  ActivityType,
  ListType,
  SequenceStatus,
  SequenceStepType,
  EnrollmentStatus,
  ProposalStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Dataset référentiel ────────────────────────────────────────────

type Seed = {
  id: number;
  nom: string;
  siren: string;
  ape: string;
  naf: string;
  forme: string;
  categorie: CategorieEntreprise;
  region: string;
  dept: string;
  ville: string;
  cp: string;
  effectifs: string;
  ca: number;
  icp: number;
  contact: string;
  poste: string;
  email: string;
  phone: string;
};

const DATASET: Seed[] = [
  { id: 1,  nom: "Pierre & Vacances",      siren: "314879499", ape: "5510Z", naf: "hotel",      forme: "SA",   categorie: "GE",  region: "Île-de-France",              dept: "75", ville: "Paris",     cp: "75008", effectifs: "1000+",   ca: 252, icp: 87, contact: "Marc Duval",          poste: "DAF",           email: "m.duval@pv-holidays.com",     phone: "+33 1 45 22 10 00" },
  { id: 2,  nom: "Novotel Lyon Centre",    siren: "552110941", ape: "5510Z", naf: "hotel",      forme: "SAS",  categorie: "ETI", region: "Auvergne-Rhône-Alpes",       dept: "69", ville: "Lyon",      cp: "69002", effectifs: "250-999", ca: 45,  icp: 82, contact: "Sophie Renard",       poste: "DG",            email: "s.renard@novotel.fr",         phone: "+33 4 72 56 32 00" },
  { id: 3,  nom: "B&B Hotels France",      siren: "421261699", ape: "5510Z", naf: "hotel",      forme: "SAS",  categorie: "GE",  region: "Nouvelle-Aquitaine",         dept: "33", ville: "Bordeaux",  cp: "33000", effectifs: "1000+",   ca: 68,  icp: 84, contact: "Pierre Lemaire",      poste: "CEO",           email: "p.lemaire@bbhotels.com",      phone: "+33 5 57 18 40 00" },
  { id: 4,  nom: "Mercure Marseille",      siren: "311847201", ape: "5510Z", naf: "hotel",      forme: "SARL", categorie: "ETI", region: "Provence-Alpes-Côte d'Azur", dept: "13", ville: "Marseille", cp: "13001", effectifs: "50-249",  ca: 38,  icp: 76, contact: "Julie Moreau",        poste: "DAF",           email: "j.moreau@mercure-marseille.fr", phone: "+33 4 91 52 00 00" },
  { id: 5,  nom: "Ibis Styles Nice",       siren: "490614980", ape: "5510Z", naf: "hotel",      forme: "SAS",  categorie: "ETI", region: "Provence-Alpes-Côte d'Azur", dept: "06", ville: "Nice",      cp: "06000", effectifs: "50-249",  ca: 29,  icp: 71, contact: "Laurent Petit",       poste: "DG",            email: "l.petit@ibis-nice.fr",        phone: "+33 4 93 88 14 00" },
  { id: 6,  nom: "Carrefour Bordeaux Lac", siren: "652014051", ape: "4711D", naf: "retail",     forme: "SA",   categorie: "GE",  region: "Nouvelle-Aquitaine",         dept: "33", ville: "Bordeaux",  cp: "33300", effectifs: "1000+",   ca: 185, icp: 89, contact: "Nicolas Martin",      poste: "Dir. Énergie",  email: "n.martin@carrefour.com",      phone: "+33 5 56 43 88 00" },
  { id: 7,  nom: "Auchan Lille Flandres",  siren: "821461407", ape: "4711D", naf: "retail",     forme: "SA",   categorie: "GE",  region: "Hauts-de-France",            dept: "59", ville: "Lille",     cp: "59000", effectifs: "1000+",   ca: 892, icp: 91, contact: "Amélie Dubois",       poste: "RSE Director",  email: "a.dubois@auchan.fr",          phone: "+33 3 28 37 67 00" },
  { id: 8,  nom: "Leroy Merlin Nice Nord", siren: "378881916", ape: "4711D", naf: "retail",     forme: "SAS",  categorie: "ETI", region: "Provence-Alpes-Côte d'Azur", dept: "06", ville: "Nice",      cp: "06200", effectifs: "250-999", ca: 97,  icp: 78, contact: "François Blanc",      poste: "DAF",           email: "f.blanc@leroymerlin.fr",      phone: "+33 4 93 18 75 00" },
  { id: 9,  nom: "Primark France",         siren: "831746218", ape: "4711D", naf: "retail",     forme: "SAS",  categorie: "GE",  region: "Nouvelle-Aquitaine",         dept: "33", ville: "Bordeaux",  cp: "33000", effectifs: "1000+",   ca: 143, icp: 74, contact: "Emma Wilson",         poste: "Country Dir.",  email: "e.wilson@primark.com",        phone: "+33 5 40 12 50 00" },
  { id: 10, nom: "Galeries Lafayette",     siren: "572073191", ape: "4711D", naf: "retail",     forme: "SA",   categorie: "GE",  region: "Île-de-France",              dept: "75", ville: "Paris",     cp: "75009", effectifs: "1000+",   ca: 325, icp: 77, contact: "Charles Dupont",      poste: "DG Adjoint",    email: "c.dupont@galerieslafayette.com", phone: "+33 1 42 82 34 56" },
  { id: 11, nom: "Amazon FR Logistics",    siren: "487617586", ape: "5229B", naf: "logistique", forme: "SAS",  categorie: "GE",  region: "Hauts-de-France",            dept: "59", ville: "Lille",     cp: "59000", effectifs: "1000+",   ca: 385, icp: 92, contact: "Anna Schmidt",        poste: "Ops Director",  email: "a.schmidt@amazon.fr",         phone: "+33 3 20 95 60 00" },
  { id: 12, nom: "FM Logistic Nantes",     siren: "390318784", ape: "5229B", naf: "logistique", forme: "SA",   categorie: "GE",  region: "Pays de la Loire",           dept: "44", ville: "Nantes",    cp: "44000", effectifs: "250-999", ca: 210, icp: 85, contact: "Thomas Girard",       poste: "DAF",           email: "t.girard@fmlogistic.com",     phone: "+33 2 40 89 45 00" },
  { id: 13, nom: "XPO Logistics Lyon",     siren: "521307928", ape: "5229B", naf: "logistique", forme: "SAS",  categorie: "GE",  region: "Auvergne-Rhône-Alpes",       dept: "69", ville: "Lyon",      cp: "69003", effectifs: "250-999", ca: 168, icp: 80, contact: "Marie-C. Foret",      poste: "Dir. Technique", email: "mc.foret@xpo.com",            phone: "+33 4 78 63 20 00" },
  { id: 14, nom: "Arkema Lacq",            siren: "268028564", ape: "2013A", naf: "industrie",  forme: "SA",   categorie: "GE",  region: "Nouvelle-Aquitaine",         dept: "33", ville: "Bordeaux",  cp: "33000", effectifs: "1000+",   ca: 560, icp: 73, contact: "Gilles Arnaud",       poste: "VP Ops",        email: "g.arnaud@arkema.com",         phone: "+33 5 59 09 55 00" },
  { id: 15, nom: "Renault Trucks Lyon",    siren: "612022451", ape: "2013A", naf: "industrie",  forme: "SAS",  categorie: "GE",  region: "Auvergne-Rhône-Alpes",       dept: "69", ville: "Lyon",      cp: "69800", effectifs: "1000+",   ca: 450, icp: 79, contact: "Jean-Paul Simon",     poste: "DAF",           email: "jp.simon@renault-trucks.com", phone: "+33 4 72 96 81 00" },
  { id: 16, nom: "Eurazeo Immobilier",     siren: "879714381", ape: "6820B", naf: "immo",       forme: "SA",   categorie: "ETI", region: "Île-de-France",              dept: "75", ville: "Paris",     cp: "75008", effectifs: "50-249",  ca: 122, icp: 86, contact: "Isabelle Chevalier",  poste: "Asset Manager", email: "i.chevalier@eurazeo.com",     phone: "+33 1 44 15 01 11" },
  { id: 17, nom: "Covivio Offices Lyon",   siren: "614040025", ape: "6820B", naf: "immo",       forme: "SA",   categorie: "ETI", region: "Auvergne-Rhône-Alpes",       dept: "69", ville: "Lyon",      cp: "69006", effectifs: "50-249",  ca: 89,  icp: 83, contact: "Alexis Perrin",       poste: "DG",            email: "a.perrin@covivio.fr",         phone: "+33 4 78 95 40 00" },
  { id: 18, nom: "Icade Promotion Paris",  siren: "582066724", ape: "6820B", naf: "immo",       forme: "SA",   categorie: "GE",  region: "Île-de-France",              dept: "92", ville: "Issy-les-Moulineaux", cp: "92130", effectifs: "250-999", ca: 195, icp: 81, contact: "Claire Gautier", poste: "DAF",         email: "c.gautier@icade.fr",          phone: "+33 1 41 57 70 00" },
  { id: 19, nom: "Sodexo Services FR",     siren: "301940219", ape: "8211Z", naf: "services",   forme: "SA",   categorie: "GE",  region: "Provence-Alpes-Côte d'Azur", dept: "13", ville: "Marseille", cp: "13008", effectifs: "1000+",   ca: 215, icp: 88, contact: "Bertrand Roux",       poste: "Dir. Énergie",  email: "b.roux@sodexo.com",           phone: "+33 4 91 29 80 00" },
  { id: 20, nom: "ISS Facility Nantes",    siren: "450672890", ape: "8211Z", naf: "services",   forme: "SAS",  categorie: "ETI", region: "Pays de la Loire",           dept: "44", ville: "Nantes",    cp: "44000", effectifs: "50-249",  ca: 98,  icp: 75, contact: "Nathalie Rousseau",   poste: "DAF",           email: "n.rousseau@fr.issworld.com",  phone: "+33 2 51 13 20 00" },
];

function statusFromIcp(icp: number): CompanyStatus {
  if (icp >= 85) return CompanyStatus.LEAD;
  return CompanyStatus.PROSPECT;
}

// Helper : date relative à maintenant
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  // 1. Tenant Lihtea ────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "lihtea" },
    update: {},
    create: { slug: "lihtea", name: "Lihtea" },
  });

  // 2. Admin ──────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "vincent@lihtea.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { tenantId: tenant.id, role: UserRole.OWNER },
    create: {
      email: adminEmail,
      name: "Vincent Grzeziczak",
      role: UserRole.OWNER,
      passwordHash,
      tenantId: tenant.id,
    },
  });

  // 3. Comptes + Contacts principaux ───────────────────────────────
  for (const d of DATASET) {
    const companyData = {
      name: d.nom,
      siren: d.siren,
      apeCode: d.ape,
      legalForm: d.forme,
      nafBucket: d.naf,
      categorieEntreprise: d.categorie,
      headcountBand: d.effectifs,
      revenueM: d.ca,
      revenueYear: 2024,
      region: d.region,
      department: d.dept,
      city: d.ville,
      postalCode: d.cp,
      icp: d.icp,
      status: statusFromIcp(d.icp),
      source: CompanySource.SEED,
      isActive: true,
      tenantId: tenant.id,
    };
    const company = await prisma.company.upsert({
      where: { id: `seed-${d.id}` },
      update: companyData,
      create: { id: `seed-${d.id}`, ...companyData },
    });

    const [firstName, ...rest] = d.contact.split(" ");
    const lastName = rest.join(" ") || d.contact;

    const contactData = {
      firstName,
      lastName,
      jobTitle: d.poste,
      email: d.email,
      phone: d.phone,
      isPrimary: true,
      isExecutive: ["CEO", "DG", "Président"].some((k) => d.poste.includes(k)),
      companyId: company.id,
      tenantId: tenant.id,
    };
    await prisma.contact.upsert({
      where: { id: `seed-contact-${d.id}` },
      update: contactData,
      create: { id: `seed-contact-${d.id}`, ...contactData },
    });
  }

  // 4. Contacts secondaires (8 comptes en ont un 2ème) ─────────────
  const secondaries = [
    { cid: 1,  fn: "Claire",  ln: "Bernard",  poste: "Dir. achats",     email: "c.bernard@pv-holidays.com" },
    { cid: 3,  fn: "Antoine", ln: "Leclerc",  poste: "COO",             email: "a.leclerc@bbhotels.com" },
    { cid: 6,  fn: "Sophie",  ln: "Marchal",  poste: "Dir. opérations", email: "s.marchal@carrefour.com" },
    { cid: 7,  fn: "Hugo",    ln: "Vandamme", poste: "CTO",             email: "h.vandamme@auchan.fr" },
    { cid: 11, fn: "Léa",     ln: "Dupuis",   poste: "Dir. supply",     email: "l.dupuis@amazon.fr" },
    { cid: 12, fn: "Olivier", ln: "Tanguy",   poste: "Dir. technique",  email: "o.tanguy@fmlogistic.com" },
    { cid: 15, fn: "Yannick", ln: "Morel",    poste: "Dir. achats",     email: "y.morel@renault-trucks.com" },
    { cid: 19, fn: "Camille", ln: "Roussel",  poste: "RSE Manager",     email: "c.roussel@sodexo.com" },
  ];
  for (const s of secondaries) {
    await prisma.contact.upsert({
      where: { id: `seed-contact-sec-${s.cid}` },
      update: {
        firstName: s.fn,
        lastName: s.ln,
        jobTitle: s.poste,
        email: s.email,
        companyId: `seed-${s.cid}`,
        tenantId: tenant.id,
      },
      create: {
        id: `seed-contact-sec-${s.cid}`,
        firstName: s.fn,
        lastName: s.ln,
        jobTitle: s.poste,
        email: s.email,
        isPrimary: false,
        companyId: `seed-${s.cid}`,
        tenantId: tenant.id,
      },
    });
  }

  // 5. Deals (pipeline 6 étapes) ────────────────────────────────────
  const deals = [
    { id: "deal-1", cid: 1,  name: "POC 6 hôtels P&V",           amount: 85000,  proba: 45, stage: DealStage.QUALIFICATION, close: 45 },
    { id: "deal-2", cid: 11, name: "Amazon — déploiement Lille", amount: 120000, proba: 60, stage: DealStage.DEMO,          close: 30 },
    { id: "deal-3", cid: 6,  name: "Carrefour — extension 3 régions", amount: 42500, proba: 65, stage: DealStage.PROPOSAL, close: 15 },
    { id: "deal-4", cid: 12, name: "FM Logistic — refonte TMS",  amount: 95000,  proba: 75, stage: DealStage.NEGOTIATION,  close: 8  },
    { id: "deal-5", cid: 7,  name: "Auchan — RSE reporting",     amount: 58000,  proba: 100, stage: DealStage.WON,          close: -5, closed: 5 },
    { id: "deal-6", cid: 15, name: "Renault Trucks — site pilote", amount: 38000, proba: 0, stage: DealStage.LOST,          close: -20, closed: 20, lost: "Budget non validé côté client" },
  ];
  for (const d of deals) {
    await prisma.deal.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        tenantId: tenant.id,
        companyId: `seed-${d.cid}`,
        primaryContactId: `seed-contact-${d.cid}`,
        ownerId: admin.id,
        name: d.name,
        amount: d.amount,
        currency: "EUR",
        probability: d.proba,
        stage: d.stage,
        expectedCloseAt: d.close > 0 ? daysAhead(d.close) : daysAgo(-d.close),
        closedAt: d.closed ? daysAgo(d.closed) : null,
        lostReason: d.lost ?? null,
      },
    });
  }

  // 6. Activités (journal) ──────────────────────────────────────────
  //    on purge puis on recrée (pas d'unique key naturelle)
  await prisma.activity.deleteMany({ where: { tenantId: tenant.id } });
  const activities = [
    { type: ActivityType.EMAIL_IN,   subject: "Re: Proposition Amazon Lille", company: 11, contact: 11, deal: "deal-2", days: 0,  body: "Demande de call suivi cette semaine." },
    { type: ActivityType.EMAIL_OUT,  subject: "Envoi proposition Carrefour",  company: 6,  contact: 6,  deal: "deal-3", days: 2,  body: "Proposition V2 envoyée avec conditions négociées." },
    { type: ActivityType.CALL,       subject: "Appel DAF FM Logistic",        company: 12, contact: 12, deal: "deal-4", days: 1,  body: "Accord sur 95k€ — attente BAT juridique." },
    { type: ActivityType.MEETING,    subject: "RDV démo Pierre & Vacances",   company: 1,  contact: 1,  deal: "deal-1", days: 3,  body: "Démo réalisée, accueil positif, décision Q2." },
    { type: ActivityType.NOTE,       subject: "Note qualification P&V",       company: 1,                deal: "deal-1", days: 3,  body: "Budget confirmé, décideur = DAF." },
    { type: ActivityType.SIGNAL,     subject: "💰 Levée de fonds détectée",   company: 11,                               days: 4,  body: "Amazon FR Logistics a annoncé un investissement entrepôt Lille de 65M€." },
    { type: ActivityType.SIGNAL,     subject: "👤 Nouveau dirigeant",         company: 13,                               days: 6,  body: "XPO Logistics Lyon — arrivée de Marie-C. Foret au poste de Directrice Technique." },
    { type: ActivityType.DEAL_MOVED, subject: "Auchan — passé en Gagné",      company: 7,                deal: "deal-5", days: 5,  body: "Deal déplacé Proposition → Gagné. Contrat signé." },
    { type: ActivityType.DEAL_MOVED, subject: "FM Logistic — Démo → Négo",    company: 12,               deal: "deal-4", days: 1,  body: "Progression naturelle après démo concluante." },
    { type: ActivityType.SEQUENCE_SENT, subject: "Séquence ETI Hôtellerie — étape 1 envoyée", company: 4, contact: 4,  days: 7,  body: "Email d'introduction envoyé via Resend." },
    { type: ActivityType.ENRICHMENT, subject: "Enrichissement Pappers", company: 2, days: 10, body: "Données financières 2024 récupérées (CA 45M€, résultat net 3.2M€)." },
  ];
  for (const a of activities) {
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        type: a.type,
        subject: a.subject,
        body: a.body,
        createdById: admin.id,
        companyId: a.company ? `seed-${a.company}` : null,
        contactId: a.contact ? `seed-contact-${a.contact}` : null,
        dealId: a.deal ?? null,
        occurredAt: daysAgo(a.days),
      },
    });
  }

  // 7. Listes ICP ────────────────────────────────────────────────────
  const listICP1 = await prisma.list.upsert({
    where: { id: "list-eti-hotel" },
    update: {},
    create: {
      id: "list-eti-hotel",
      tenantId: tenant.id,
      name: "🏨 ETI Hôtellerie Sud-Est",
      description: "Hôtels 50-250 employés en PACA + Occitanie avec ICP ≥ 70",
      color: "#14b8a6",
      type: ListType.DYNAMIC,
      ownerId: admin.id,
      filtersJson: {
        nafBucket: ["hotel"],
        headcountBand: ["50-249"],
        region: ["Provence-Alpes-Côte d'Azur", "Occitanie"],
        icpMin: 70,
      },
      lastRefreshedAt: new Date(),
    },
  });

  const listICP2 = await prisma.list.upsert({
    where: { id: "list-logistique-gros" },
    update: {},
    create: {
      id: "list-logistique-gros",
      tenantId: tenant.id,
      name: "🚛 Logistique > 150M CA",
      description: "NAF 52.29 avec CA supérieur à 150M€",
      color: "#d4a574",
      type: ListType.DYNAMIC,
      ownerId: admin.id,
      filtersJson: {
        nafBucket: ["logistique"],
        revenueMMin: 150,
      },
      lastRefreshedAt: new Date(),
    },
  });

  const listICP3 = await prisma.list.upsert({
    where: { id: "list-clients-historiques" },
    update: {},
    create: {
      id: "list-clients-historiques",
      tenantId: tenant.id,
      name: "⭐ Clients historiques",
      description: "Snapshot statique — comptes clients prioritaires 2025",
      color: "#7c3aed",
      type: ListType.STATIC,
      ownerId: admin.id,
    },
  });

  // Peupler ListMember pour les listes dynamiques (snapshot initial) + liste statique
  const eligible1 = await prisma.company.findMany({
    where: {
      tenantId: tenant.id,
      nafBucket: "hotel",
      headcountBand: "50-249",
      region: { in: ["Provence-Alpes-Côte d'Azur", "Occitanie"] },
      icp: { gte: 70 },
    },
    select: { id: true },
  });
  const eligible2 = await prisma.company.findMany({
    where: {
      tenantId: tenant.id,
      nafBucket: "logistique",
      revenueM: { gte: 150 },
    },
    select: { id: true },
  });

  // purge + repopulate
  await prisma.listMember.deleteMany({
    where: { listId: { in: [listICP1.id, listICP2.id, listICP3.id] } },
  });
  for (const c of eligible1) {
    await prisma.listMember.create({
      data: { listId: listICP1.id, companyId: c.id },
    });
  }
  for (const c of eligible2) {
    await prisma.listMember.create({
      data: { listId: listICP2.id, companyId: c.id },
    });
  }
  // Liste statique : 5 comptes "historiques" choisis manuellement
  for (const id of ["seed-7", "seed-11", "seed-14", "seed-19", "seed-1"]) {
    await prisma.listMember.create({
      data: { listId: listICP3.id, companyId: id },
    });
  }

  // 8. Séquences ────────────────────────────────────────────────────
  const seqActive = await prisma.sequence.upsert({
    where: { id: "seq-eti-hotel" },
    update: {},
    create: {
      id: "seq-eti-hotel",
      tenantId: tenant.id,
      name: "ETI Hôtellerie Sud-Est — intro",
      description: "Séquence 3 étapes pour les hôtels 50-250 du Sud-Est",
      status: SequenceStatus.ACTIVE,
      ownerId: admin.id,
      fromName: "Vincent Grzeziczak",
      fromEmail: "vincent@lihtea.com",
      replyTo: "vincent@lihtea.com",
    },
  });

  // Steps séquence active
  await prisma.sequenceStep.deleteMany({ where: { sequenceId: seqActive.id } });
  await prisma.sequenceStep.createMany({
    data: [
      {
        sequenceId: seqActive.id,
        order: 1,
        type: SequenceStepType.EMAIL,
        delayDays: 0,
        subject: "{{firstName}}, idée pour {{companyName}}",
        bodyMarkdown:
          "Bonjour {{firstName}},\n\nJ'accompagne des groupes hôteliers de votre taille dans l'optimisation de leur performance énergétique. Serait-il pertinent d'échanger 15 minutes cette semaine ?\n\nVincent",
      },
      {
        sequenceId: seqActive.id,
        order: 2,
        type: SequenceStepType.EMAIL,
        delayDays: 4,
        subject: "Re: {{firstName}}, idée pour {{companyName}}",
        bodyMarkdown:
          "{{firstName}},\n\nPour donner un ordre d'idée, nos clients de taille comparable réduisent leurs charges d'exploitation de 8 à 14% sur 18 mois.\n\nUn créneau 15 min ?",
      },
      {
        sequenceId: seqActive.id,
        order: 3,
        type: SequenceStepType.EMAIL,
        delayDays: 7,
        subject: "Dernier message",
        bodyMarkdown:
          "{{firstName}}, si le sujet n'est pas prioritaire pour vous en ce moment, aucun souci — je referme le dossier de mon côté.\n\nBonne continuation,\nVincent",
      },
    ],
  });

  const seqDraft = await prisma.sequence.upsert({
    where: { id: "seq-logistique" },
    update: {},
    create: {
      id: "seq-logistique",
      tenantId: tenant.id,
      name: "Logistique > 150M — démo ciblée",
      description: "Brouillon à peaufiner avant lancement",
      status: SequenceStatus.DRAFT,
      ownerId: admin.id,
      fromName: "Vincent Grzeziczak",
      fromEmail: "vincent@lihtea.com",
    },
  });

  await prisma.sequenceStep.deleteMany({ where: { sequenceId: seqDraft.id } });
  await prisma.sequenceStep.create({
    data: {
      sequenceId: seqDraft.id,
      order: 1,
      type: SequenceStepType.EMAIL,
      delayDays: 0,
      subject: "Cas client logistique",
      bodyMarkdown: "À rédiger",
    },
  });

  // Inscriptions : quelques contacts dans la séquence active
  await prisma.sequenceEnrollment.deleteMany({
    where: { sequenceId: seqActive.id },
  });
  for (const cid of [2, 4, 5]) {
    await prisma.sequenceEnrollment.create({
      data: {
        sequenceId: seqActive.id,
        contactId: `seed-contact-${cid}`,
        currentStepOrder: cid === 4 ? 2 : 1,
        status: EnrollmentStatus.ACTIVE,
        startedAt: daysAgo(7),
        nextSendAt: daysAhead(1),
      },
    });
  }

  // 9. Propositions ──────────────────────────────────────────────────
  await prisma.proposal.upsert({
    where: { id: "prop-carrefour" },
    update: {},
    create: {
      id: "prop-carrefour",
      tenantId: tenant.id,
      dealId: "deal-3",
      companyId: "seed-6",
      title: "Proposition Carrefour — extension 3 régions",
      amount: 42500,
      currency: "EUR",
      status: ProposalStatus.VIEWED,
      externalUrl: "https://docs.google.com/document/d/placeholder-carrefour",
      sentAt: daysAgo(4),
      viewedAt: daysAgo(2),
    },
  });
  await prisma.proposal.upsert({
    where: { id: "prop-auchan" },
    update: {},
    create: {
      id: "prop-auchan",
      tenantId: tenant.id,
      dealId: "deal-5",
      companyId: "seed-7",
      title: "Proposition Auchan — RSE reporting",
      amount: 58000,
      currency: "EUR",
      status: ProposalStatus.SIGNED,
      externalUrl: "https://docs.google.com/document/d/placeholder-auchan",
      sentAt: daysAgo(12),
      viewedAt: daysAgo(10),
      signedAt: daysAgo(5),
    },
  });
  await prisma.proposal.upsert({
    where: { id: "prop-pv" },
    update: {},
    create: {
      id: "prop-pv",
      tenantId: tenant.id,
      dealId: "deal-1",
      companyId: "seed-1",
      title: "Proposition Pierre & Vacances — POC 6 hôtels",
      amount: 85000,
      currency: "EUR",
      status: ProposalStatus.DRAFT,
    },
  });

  // 10. Tâches ──────────────────────────────────────────────────────
  await prisma.task.deleteMany({ where: { tenantId: tenant.id } });
  const tasks = [
    { title: "Relancer Pierre & Vacances sur la proposition POC",     priority: TaskPriority.URGENT, company: 1,  deal: "deal-1",  due: 0 },
    { title: "Préparer deck démo Pierre & Vacances",                  priority: TaskPriority.HIGH,   company: 1,  deal: "deal-1",  due: 1 },
    { title: "Valider la séquence 'Logistique > 150M' avant lancement", priority: TaskPriority.NORMAL, due: 2 },
    { title: "Envoyer BAT juridique à FM Logistic",                   priority: TaskPriority.HIGH,   company: 12, deal: "deal-4",  due: 3 },
    { title: "Appeler Amazon FR Logistics (Anna Schmidt)",            priority: TaskPriority.NORMAL, company: 11, contact: 11, deal: "deal-2", due: 4 },
  ];
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        title: t.title,
        priority: t.priority,
        status: TaskStatus.TODO,
        assigneeId: admin.id,
        companyId: t.company ? `seed-${t.company}` : null,
        contactId: t.contact ? `seed-contact-${t.contact}` : null,
        dealId: t.deal ?? null,
        dueAt: daysAhead(t.due),
      },
    });
  }

  // ─── Résumé ────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.company.count({ where: { tenantId: tenant.id } }),
    prisma.contact.count({ where: { tenantId: tenant.id } }),
    prisma.deal.count({ where: { tenantId: tenant.id } }),
    prisma.activity.count({ where: { tenantId: tenant.id } }),
    prisma.list.count({ where: { tenantId: tenant.id } }),
    prisma.sequence.count({ where: { tenantId: tenant.id } }),
    prisma.proposal.count({ where: { tenantId: tenant.id } }),
    prisma.task.count({ where: { tenantId: tenant.id } }),
  ]);

  console.log(
    `✓ Seed OK — tenant ${tenant.slug}
      ↳ ${counts[0]} comptes
      ↳ ${counts[1]} contacts
      ↳ ${counts[2]} deals
      ↳ ${counts[3]} activités
      ↳ ${counts[4]} listes ICP
      ↳ ${counts[5]} séquences
      ↳ ${counts[6]} propositions
      ↳ ${counts[7]} tâches
      ↳ admin : ${adminEmail}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
