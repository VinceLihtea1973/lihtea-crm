/**
 * GET /api/auth/gmail/callback
 * Reçoit le code Google, échange contre les tokens, stocke en base.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/parametres?gmail_error=${error ?? "no_code"}`, req.url)
    );
  }

  try {
    const { tenantId } = await requireTenant();
    const tokens = await exchangeCodeForTokens(code);

    // Upsert — un seul compte Gmail par tenant
    await prisma.gmailAccount.upsert({
      where:  { tenantId },
      create: {
        tenantId,
        email:        tokens.email,
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt:    tokens.expiresAt,
      },
      update: {
        email:        tokens.email,
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt:    tokens.expiresAt,
      },
    });

    return NextResponse.redirect(new URL("/parametres?gmail_connected=1", req.url));
  } catch (err) {
    console.error("[gmail/callback]", err);
    return NextResponse.redirect(new URL("/parametres?gmail_error=server", req.url));
  }
}
