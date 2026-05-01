# Lihtea — Plateforme commerciale

Plateforme interne Lihtea (prospection, CRM, séquences, simulateur), conçue multi-tenant dès le départ pour passer SaaS sans refonte. Phase 1 du plan global : fondations techniques + portage du design system de la démo HTML.

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind 3
- **Prisma** + **Postgres Supabase**
- **NextAuth / Auth.js v5** (credentials + Google)
- **Vitest** pour l'unitaire, **Playwright** pour l'e2e (Phase 6)

## Démarrage local

Pré-requis : Node 20.11+, pnpm 9, un projet Supabase.

```bash
pnpm install
cp .env.example .env.local
# Remplir DATABASE_URL, DIRECT_URL, AUTH_SECRET dans .env.local

pnpm db:generate      # prisma generate
pnpm db:migrate       # crée les tables sur Supabase
pnpm db:seed          # tenant Lihtea + 20 entreprises démo + 1 admin

pnpm dev
```

Connexion au premier lancement :

- Email : `vincent@lihtea.com` (ou la valeur de `SEED_ADMIN_EMAIL`)
- Mot de passe : `ChangeMeNow!` (ou la valeur de `SEED_ADMIN_PASSWORD`)

Une fois connecté, tu arrives sur `/dashboard`. La sidebar donne accès à tous les modules — seuls **Dashboard** et **Prospection** affichent de vraies données en Phase 1, les autres sont des placeholders qui indiquent la phase où ils seront construits.

## Arborescence

```
platform/
  app/
    (auth)/signin/        — page publique
    (app)/                — espace authentifié (layout avec sidebar)
      dashboard/
      prospection/        — branché Prisma (seed)
      pipeline/           — placeholder Phase 3
      clients/            — placeholder Phase 3
      sequences/          — placeholder Phase 4
      simulateur/         — placeholder Phase 5
      scenarios/          — placeholder Phase 5
      propositions/       — placeholder Phase 5
      dossiers/           — placeholder Phase 5
      ressources/         — placeholder Phase 5
    api/auth/[...nextauth]
    layout.tsx
    page.tsx
  components/
    layout/               — Sidebar, Header
    ui/                   — Button, Chip, Avatar, PlaceholderPage
  lib/                    — prisma, auth, tenant, cn
  prisma/
    schema.prisma
    seed.ts
  tests/                  — vitest
  middleware.ts           — protection des routes (app)/*
```

## Conventions

Voir `CLAUDE.md` pour les règles détaillées (multi-tenant, server components, style).

## Déploiement

- **Repo GitHub** : `lihtea-platform` sur le compte `vincent@lihtea.com`
- **Hébergement** : Vercel (préview par branche, prod sur `main`)
- **Base de données** : Supabase, mêmes credentials
- Les secrets Vercel à configurer : `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Roadmap

Détail complet dans `../PLAN-PLATEFORME-LIHTEA.md`. Phases suivantes :

1. **Phase 2** — intégration Sirene + moteur ICP paramétrable
2. **Phase 3** — CRM cœur (Clients + Pipeline + Dashboard complet)
3. **Phase 4** — Séquences opérationnelles (envoi + tracking)
4. **Phase 5** — Documents + lien Simulateur
5. **Phase 6** — durcissement + activation SaaS
