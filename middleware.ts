import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware Edge léger — vérifie uniquement le cookie de session JWT.
 * N'importe PAS auth() / bcryptjs (trop lourd pour l'Edge Runtime < 1 MB).
 *
 * Routes protégées (alignées avec la Sidebar v6) :
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedHit = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!protectedHit) return NextResponse.next();

  // Lecture du cookie JWT NextAuth v5 (plusieurs variantes selon l'env)
  const sessionToken =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token") ??
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
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
