# Conventions — Lihtea platform

Ce fichier documente les règles du projet pour qu'un développeur (humain ou agent IA) arrive à naviguer et contribuer sans surprises. Il évoluera avec les phases.

## Principes

1. **Multi-tenant d'abord.** Toute table métier porte `tenantId`. Toute requête Prisma filtre par `tenantId` issu de la session. Si une requête ne filtre pas par tenant, c'est un bug. Passer systématiquement par `requireTenant()` / `tenantScoped()` dans `lib/tenant.ts`.
2. **Server components par défaut.** Les pages Next sont async server components qui lisent la base directement via Prisma. Les composants `"use client"` sont réservés à l'interactivité locale (sidebar active, formulaires, drag-and-drop).
3. **Design system = source unique.** Les tokens (palette, radius, shadows) sont déclarés dans `app/globals.css` + `tailwind.config.ts`. Aucun style inline dur — toujours des classes Tailwind ou les variables CSS.
4. **Continuité visuelle avec la démo HTML.** Les composants UI doivent reproduire le look de `../lihtea-prospection-demo.html`. Utiliser cette démo comme référence pour chaque nouvel écran.
5. **Éviter les régressions sur l'auth.** Les routes sous `app/(app)/*` sont protégées par le middleware + `requireTenant()` dans le layout. Ne jamais créer une route authentifiée hors de ce groupe.

## Structure des pages

Chaque page d'un module suit ce squelette :

```tsx
import { Header } from "@/components/layout/Header";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Titre du module" };

export default async function Page() {
  const { tenantId } = await requireTenant();
  const data = await prisma.xxx.findMany({ where: { tenantId } });
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Titre" subtitle="Sous-titre" />
      <div className="flex-1 overflow-y-auto p-6">…</div>
    </div>
  );
}
```

## Nommage

- Fichiers composants : PascalCase (`Sidebar.tsx`).
- Utilitaires : camelCase (`cn.ts`, `prisma.ts`).
- Routes : kebab-case lowercase (`/propositions`, `/sequences`).
- Enums Prisma : SCREAMING_SNAKE_CASE (`PROSPECT`, `LEAD`).

## Git

- Branches : `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commits conventionnels (`feat(prospection): …`).
- Chaque PR lance la CI (lint + typecheck + test + build). Pas de merge si rouge.

## Qu'est-ce qui bloque la Phase 2 ?

Avant d'attaquer la prospection réelle, s'assurer que :

- [ ] Le projet tourne en local (`pnpm dev` + login OK).
- [ ] Le projet est déployé sur Vercel avec Supabase branché.
- [ ] Le repo GitHub existe et la CI passe au vert.

Une fois ces trois points verts, on entre en Phase 2 : intégration Sirene + scoring ICP.
