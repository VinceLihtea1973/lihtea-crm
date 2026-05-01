import { Header } from "@/components/layout/Header";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { GmailConnectButton, GmailDisconnectButton } from "./GmailButtons";

export const metadata = { title: "Paramètres" };
export const dynamic  = "force-dynamic";

export default async function ParametresPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail_connected?: string; gmail_error?: string }>;
}) {
  const { tenantId } = await requireTenant();
  const sp           = await searchParams;

  // Wrapped in try/catch in case the migration hasn't been run yet
  let gmailAccount: { email: string } | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gmailAccount = await (prisma as any).gmailAccount.findUnique({ where: { tenantId } });
  } catch {
    // migration pending — gmailAccount stays null
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Paramètres"
        subtitle="Configuration de votre espace Lihtea"
        breadcrumbs={[{ label: "Paramètres" }]}
      />

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">

        {/* Feedback connexion */}
        {sp.gmail_connected && (
          <div className="mb-5 px-4 py-3 bg-teal/10 border border-teal/30 rounded-xl text-[13px] text-teal font-semibold">
            ✓ Gmail connecté avec succès.
          </div>
        )}
        {sp.gmail_error && (
          <div className="mb-5 px-4 py-3 bg-lh-red-bg border border-lh-red/30 rounded-xl text-[13px] text-lh-red font-semibold">
            Erreur de connexion Gmail : {sp.gmail_error}
          </div>
        )}

        {/* Section Gmail */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-bg">
            <div className="text-[13px] font-bold text-navy">Compte Gmail d'envoi</div>
            <div className="text-[12px] text-text-3 mt-0.5">
              Connectez votre compte Google Workspace pour envoyer les séquences depuis votre vraie adresse.
            </div>
          </div>

          <div className="px-5 py-5">
            {gmailAccount ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal/10 border border-teal/20 grid place-items-center text-[18px]">
                    📧
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-text-1">{gmailAccount.email}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-teal inline-block" />
                      <span className="text-[11px] text-teal font-semibold">Connecté</span>
                    </div>
                  </div>
                </div>
                <GmailDisconnectButton />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="text-[13px] text-text-3">
                  Aucun compte Gmail connecté. Les séquences ne peuvent pas être envoyées.
                </div>
                <GmailConnectButton />
              </div>
            )}
          </div>
        </div>

        {/* Info scopes */}
        {!gmailAccount && (
          <p className="mt-3 text-[11px] text-text-3 leading-relaxed">
            La connexion demande les permissions <strong>gmail.send</strong> (envoi) et <strong>gmail.readonly</strong> (détection des réponses). Aucun email existant n'est lu.
          </p>
        )}

      </div>
    </div>
  );
}
