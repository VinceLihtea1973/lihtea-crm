import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Redirige les routes (app)/* vers /signin si non authentifié.
 * Les routes (auth)/* et / restent accessibles.
 *
 * Ossature v6 — 12 préfixes protégés (alignés avec la Sidebar) :
 *   Pilotage     : /dashboard
 *   Acquisition  : /prospection, /listes, /sequences
 *   Ventes       : /pipeline, /comptes, /contacts, /propositions
 *   Activité     : /activites, /taches
 *   Outils       : /simulateur, /ressources
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/prospection",
  "/listes",
  "/sequences",
  "/pipeline",
  "/comptes",
  "/contacts",
  "/propositions",
  "/activites",
  "/taches",
  "/simulateur",
  "/ressources",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedHit = PROTECTED_PREFIXES.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!protectedHit) return NextResponse.next();

  const session = await auth();
  if (!session?.user?.id) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api/auth|favicon.ico|.*\\..*).*)"],
};
