import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Connexion" };

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-bg">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-lg border border-border p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] bg-teal grid place-items-center font-black text-white">
            L
          </div>
          <div>
            <div className="font-extrabold text-navy text-[18px] tracking-[-0.02em]">
              Lihtea
            </div>
            <div className="text-[12px] text-text-3">Plateforme commerciale</div>
          </div>
        </div>

        <h1 className="text-[22px] font-extrabold text-navy tracking-[-0.02em]">
          Connexion
        </h1>
        <p className="mt-1 text-[13px] text-text-2">
          Accède à ton espace Lihtea.
        </p>

        <SignInForm searchParams={searchParams} />
      </div>
    </div>
  );
}

async function SignInForm({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;

  async function credentialsAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    await signIn("credentials", {
      email,
      password,
      redirectTo: sp.next ?? "/dashboard",
    });
  }

  async function googleAction() {
    "use server";
    await signIn("google", { redirectTo: sp.next ?? "/dashboard" });
  }

  return (
    <>
      {sp.error && (
        <div className="mt-4 text-[13px] text-lh-red bg-lh-red-bg border border-lh-red/20 rounded-lg px-3 py-2">
          Identifiants invalides.
        </div>
      )}

      <form action={credentialsAction} className="mt-6 space-y-3">
        <div>
          <label className="block text-[12px] font-semibold text-text-2 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 rounded-lg border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none text-[14px]"
            placeholder="vincent@lihtea.com"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-text-2 mb-1">
            Mot de passe
          </label>
          <input
            name="password"
            type="password"
            required
            className="w-full px-3 py-2 rounded-lg border border-border focus:border-teal focus:ring-2 focus:ring-teal/20 outline-none text-[14px]"
          />
        </div>
        <Button type="submit" className="w-full justify-center mt-2">
          Se connecter
        </Button>
      </form>

      <div className="flex items-center gap-3 my-6 text-[11px] text-text-3">
        <div className="flex-1 h-px bg-border" />
        ou
        <div className="flex-1 h-px bg-border" />
      </div>

      <form action={googleAction}>
        <Button type="submit" variant="secondary" className="w-full justify-center">
          Continuer avec Google
        </Button>
      </form>
    </>
  );
}
