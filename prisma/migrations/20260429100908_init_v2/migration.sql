-- ═══════════════════════════════════════════════════════════════════
-- Migration initiale — Lihtea platform — schéma v2
-- Niveau 1 : CRM opérationnel complet
-- ═══════════════════════════════════════════════════════════════════

-- ─── Enums ─────────────────────────────────────────────────────────

CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

CREATE TYPE "CompanyStatus" AS ENUM ('PROSPECT', 'LEAD', 'CLIENT', 'LOST');

CREATE TYPE "CompanySource" AS ENUM ('SEED', 'SIRENE', 'PAPPERS', 'MANUAL', 'IMPORT');

CREATE TYPE "CategorieEntreprise" AS ENUM ('TPE', 'PME', 'ETI', 'GE');

CREATE TYPE "DealStage" AS ENUM ('QUALIFICATION', 'DEMO', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

CREATE TYPE "ActivityType" AS ENUM (
  'EMAIL_IN',
  'EMAIL_OUT',
  'CALL',
  'MEETING',
  'NOTE',
  'TASK_DONE',
  'DEAL_MOVED',
  'SEQUENCE_SENT',
  'SIGNAL',
  'ENRICHMENT'
);

CREATE TYPE "ListType" AS ENUM ('STATIC', 'DYNAMIC');

CREATE TYPE "SequenceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

CREATE TYPE "SequenceStepType" AS ENUM ('EMAIL', 'LINKEDIN', 'CALL');

CREATE TYPE "EnrollmentStatus" AS ENUM (
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'REPLIED',
  'BOUNCED',
  'UNSUBSCRIBED',
  'REMOVED'
);

CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'REJECTED', 'EXPIRED');

CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DONE', 'CANCELLED');

-- ─── Tenancy & Auth ────────────────────────────────────────────────

CREATE TABLE "tenants" (
  "id"        TEXT NOT NULL,
  "slug"      TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

CREATE TABLE "users" (
  "id"            TEXT NOT NULL,
  "email"         TEXT NOT NULL,
  "name"          TEXT,
  "image"         TEXT,
  "emailVerified" TIMESTAMP(3),
  "passwordHash"  TEXT,
  "role"          "UserRole" NOT NULL DEFAULT 'MEMBER',
  "tenantId"      TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

CREATE TABLE "accounts" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "type"               TEXT NOT NULL,
  "provider"           TEXT NOT NULL,
  "providerAccountId"  TEXT NOT NULL,
  "refresh_token"      TEXT,
  "access_token"       TEXT,
  "expires_at"         INTEGER,
  "token_type"         TEXT,
  "scope"              TEXT,
  "id_token"           TEXT,
  "session_state"      TEXT,

  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key"
  ON "accounts"("provider", "providerAccountId");

CREATE TABLE "sessions" (
  "id"           TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "expires"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "expires"    TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key"
  ON "verification_tokens"("identifier", "token");

-- ─── CRM — Référentiels ───────────────────────────────────────────

CREATE TABLE "companies" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "siren"               TEXT,
  "siret"               TEXT,
  "apeCode"             TEXT,
  "legalForm"           TEXT,
  "legalFormCode"       TEXT,
  "nafBucket"           TEXT,
  "headcountBand"       TEXT,
  "revenueM"            DOUBLE PRECISION,
  "revenueYear"         INTEGER,
  "categorieEntreprise" "CategorieEntreprise",
  "region"              TEXT,
  "department"          TEXT,
  "city"                TEXT,
  "postalCode"          TEXT,
  "address"             TEXT,
  "latitude"            DOUBLE PRECISION,
  "longitude"           DOUBLE PRECISION,
  "website"             TEXT,
  "linkedinUrl"         TEXT,
  "description"         TEXT,
  "creationDate"        TIMESTAMP(3),
  "isActive"            BOOLEAN NOT NULL DEFAULT TRUE,
  "status"              "CompanyStatus" NOT NULL DEFAULT 'PROSPECT',
  "icp"                 INTEGER,
  "source"              "CompanySource" NOT NULL DEFAULT 'MANUAL',
  "enrichedAt"          TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "companies_tenantId_status_idx"   ON "companies"("tenantId", "status");
CREATE INDEX "companies_tenantId_siren_idx"    ON "companies"("tenantId", "siren");
CREATE INDEX "companies_tenantId_apeCode_idx"  ON "companies"("tenantId", "apeCode");
CREATE INDEX "companies_tenantId_region_idx"   ON "companies"("tenantId", "region");

CREATE TABLE "contacts" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "companyId"   TEXT,
  "firstName"   TEXT,
  "lastName"    TEXT NOT NULL,
  "jobTitle"    TEXT,
  "email"       TEXT,
  "phone"       TEXT,
  "linkedin"    TEXT,
  "isPrimary"   BOOLEAN NOT NULL DEFAULT FALSE,
  "isExecutive" BOOLEAN NOT NULL DEFAULT FALSE,
  "optOut"      BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contacts_tenantId_companyId_idx" ON "contacts"("tenantId", "companyId");
CREATE INDEX "contacts_tenantId_email_idx"     ON "contacts"("tenantId", "email");

-- ─── Pipeline commercial ──────────────────────────────────────────

CREATE TABLE "deals" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "companyId"        TEXT NOT NULL,
  "primaryContactId" TEXT,
  "ownerId"          TEXT,
  "name"             TEXT NOT NULL,
  "amount"           DECIMAL(12, 2) NOT NULL,
  "currency"         TEXT NOT NULL DEFAULT 'EUR',
  "probability"      INTEGER NOT NULL,
  "stage"            "DealStage" NOT NULL DEFAULT 'QUALIFICATION',
  "expectedCloseAt"  TIMESTAMP(3),
  "closedAt"         TIMESTAMP(3),
  "lostReason"       TEXT,
  "kanbanOrder"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "deals_tenantId_stage_idx"     ON "deals"("tenantId", "stage");
CREATE INDEX "deals_tenantId_ownerId_idx"   ON "deals"("tenantId", "ownerId");
CREATE INDEX "deals_tenantId_companyId_idx" ON "deals"("tenantId", "companyId");

-- ─── Journal d'activités ──────────────────────────────────────────

CREATE TABLE "activities" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "type"        "ActivityType" NOT NULL,
  "subject"     TEXT NOT NULL,
  "body"        TEXT,
  "createdById" TEXT,
  "companyId"   TEXT,
  "contactId"   TEXT,
  "dealId"      TEXT,
  "occurredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activities_tenantId_occurredAt_idx" ON "activities"("tenantId", "occurredAt");
CREATE INDEX "activities_tenantId_companyId_idx"  ON "activities"("tenantId", "companyId");
CREATE INDEX "activities_tenantId_contactId_idx"  ON "activities"("tenantId", "contactId");
CREATE INDEX "activities_tenantId_dealId_idx"     ON "activities"("tenantId", "dealId");

-- ─── Listes ICP ───────────────────────────────────────────────────

CREATE TABLE "lists" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "color"           TEXT NOT NULL DEFAULT '#14b8a6',
  "type"            "ListType" NOT NULL DEFAULT 'DYNAMIC',
  "filtersJson"     JSONB,
  "ownerId"         TEXT,
  "lastRefreshedAt" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lists_tenantId_idx" ON "lists"("tenantId");

CREATE TABLE "list_members" (
  "listId"    TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "addedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "list_members_pkey" PRIMARY KEY ("listId", "companyId")
);

CREATE INDEX "list_members_companyId_idx" ON "list_members"("companyId");

-- ─── Séquences (Resend) ───────────────────────────────────────────

CREATE TABLE "sequences" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "status"      "SequenceStatus" NOT NULL DEFAULT 'DRAFT',
  "ownerId"     TEXT,
  "fromName"    TEXT,
  "fromEmail"   TEXT,
  "replyTo"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sequences_tenantId_status_idx" ON "sequences"("tenantId", "status");

CREATE TABLE "sequence_steps" (
  "id"           TEXT NOT NULL,
  "sequenceId"   TEXT NOT NULL,
  "order"        INTEGER NOT NULL,
  "type"         "SequenceStepType" NOT NULL DEFAULT 'EMAIL',
  "delayDays"    INTEGER NOT NULL DEFAULT 0,
  "subject"      TEXT,
  "bodyMarkdown" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sequence_steps_sequenceId_order_key"
  ON "sequence_steps"("sequenceId", "order");

CREATE TABLE "sequence_enrollments" (
  "id"               TEXT NOT NULL,
  "sequenceId"       TEXT NOT NULL,
  "contactId"        TEXT NOT NULL,
  "currentStepOrder" INTEGER NOT NULL DEFAULT 0,
  "status"           "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nextSendAt"       TIMESTAMP(3),
  "completedAt"      TIMESTAMP(3),

  CONSTRAINT "sequence_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sequence_enrollments_sequenceId_contactId_key"
  ON "sequence_enrollments"("sequenceId", "contactId");
CREATE INDEX "sequence_enrollments_nextSendAt_status_idx"
  ON "sequence_enrollments"("nextSendAt", "status");

CREATE TABLE "sequence_sends" (
  "id"              TEXT NOT NULL,
  "enrollmentId"    TEXT NOT NULL,
  "stepId"          TEXT NOT NULL,
  "resendMessageId" TEXT,
  "sentAt"          TIMESTAMP(3),
  "openedAt"        TIMESTAMP(3),
  "clickedAt"       TIMESTAMP(3),
  "bouncedAt"       TIMESTAMP(3),
  "repliedAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sequence_sends_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sequence_sends_resendMessageId_idx" ON "sequence_sends"("resendMessageId");

-- ─── Propositions ─────────────────────────────────────────────────

CREATE TABLE "proposals" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "dealId"        TEXT,
  "companyId"     TEXT,
  "title"         TEXT NOT NULL,
  "amount"        DECIMAL(12, 2) NOT NULL,
  "currency"      TEXT NOT NULL DEFAULT 'EUR',
  "status"        "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "externalUrl"   TEXT,
  "pdfStorageKey" TEXT,
  "sentAt"        TIMESTAMP(3),
  "viewedAt"      TIMESTAMP(3),
  "signedAt"      TIMESTAMP(3),
  "expiresAt"     TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "proposals_tenantId_status_idx" ON "proposals"("tenantId", "status");
CREATE INDEX "proposals_dealId_idx"          ON "proposals"("dealId");

-- ─── Tâches ───────────────────────────────────────────────────────

CREATE TABLE "tasks" (
  "id"          TEXT NOT NULL,
  "tenantId"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "description" TEXT,
  "priority"    "TaskPriority" NOT NULL DEFAULT 'NORMAL',
  "status"      "TaskStatus"   NOT NULL DEFAULT 'TODO',
  "assigneeId"  TEXT,
  "companyId"   TEXT,
  "contactId"   TEXT,
  "dealId"      TEXT,
  "dueAt"       TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tasks_tenantId_status_dueAt_idx"  ON "tasks"("tenantId", "status", "dueAt");
CREATE INDEX "tasks_tenantId_assigneeId_idx"    ON "tasks"("tenantId", "assigneeId");

-- ═══════════════════════════════════════════════════════════════════
-- FOREIGN KEYS
-- ═══════════════════════════════════════════════════════════════════

-- users
ALTER TABLE "users"
  ADD CONSTRAINT "users_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- accounts
ALTER TABLE "accounts"
  ADD CONSTRAINT "accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sessions
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- companies
ALTER TABLE "companies"
  ADD CONSTRAINT "companies_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- contacts
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- deals
ALTER TABLE "deals"
  ADD CONSTRAINT "deals_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals"
  ADD CONSTRAINT "deals_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deals"
  ADD CONSTRAINT "deals_primaryContactId_fkey"
  FOREIGN KEY ("primaryContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deals"
  ADD CONSTRAINT "deals_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- activities
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activities"
  ADD CONSTRAINT "activities_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- lists
ALTER TABLE "lists"
  ADD CONSTRAINT "lists_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lists"
  ADD CONSTRAINT "lists_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- list_members
ALTER TABLE "list_members"
  ADD CONSTRAINT "list_members_listId_fkey"
  FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "list_members"
  ADD CONSTRAINT "list_members_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sequences
ALTER TABLE "sequences"
  ADD CONSTRAINT "sequences_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sequences"
  ADD CONSTRAINT "sequences_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- sequence_steps
ALTER TABLE "sequence_steps"
  ADD CONSTRAINT "sequence_steps_sequenceId_fkey"
  FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sequence_enrollments
ALTER TABLE "sequence_enrollments"
  ADD CONSTRAINT "sequence_enrollments_sequenceId_fkey"
  FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sequence_enrollments"
  ADD CONSTRAINT "sequence_enrollments_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- sequence_sends
ALTER TABLE "sequence_sends"
  ADD CONSTRAINT "sequence_sends_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "sequence_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sequence_sends"
  ADD CONSTRAINT "sequence_sends_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "sequence_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- proposals
ALTER TABLE "proposals"
  ADD CONSTRAINT "proposals_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposals"
  ADD CONSTRAINT "proposals_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "proposals"
  ADD CONSTRAINT "proposals_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- tasks
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
