"use client";

import { Button } from "@/components/ui/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex-1 grid place-items-center p-8">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lh-red-bg text-lh-red text-xl">
          !
        </div>
        <h1 className="mt-4 text-[22px] font-extrabold text-navy tracking-[-0.02em]">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-[13px] text-text-2">
          {error.message || "Erreur inattendue côté serveur."}
        </p>
        {error.digest && (
          <p className="mt-1 text-[11px] text-text-3 font-mono">
            Référence : {error.digest}
          </p>
        )}
        <div className="mt-6">
          <Button onClick={reset}>Réessayer</Button>
        </div>
      </div>
    </div>
  );
}
