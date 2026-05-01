/**
 * GET /api/auth/gmail
 * Redirige vers Google OAuth pour connecter le compte Gmail d'envoi.
 */
import { NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail";
import { requireTenant } from "@/lib/tenant";

export async function GET() {
  try {
    await requireTenant();
    const url = getGmailAuthUrl();
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect("/parametres?error=auth");
  }
}
