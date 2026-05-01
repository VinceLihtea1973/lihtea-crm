"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectGmailAction } from "@/app/_actions/gmail";

export function GmailConnectButton() {
  return (
    <a
      href="/api/auth/gmail"
      className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-[13px] font-bold hover:bg-navy/80 transition-colors shadow-sm whitespace-nowrap"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
      </svg>
      Connecter Gmail
    </a>
  );
}

export function GmailDisconnectButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleDisconnect() {
    if (!confirm("Déconnecter le compte Gmail ? Les séquences actives seront mises en pause.")) return;
    start(async () => {
      await disconnectGmailAction();
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDisconnect}
      disabled={pending}
      className="px-3 py-1.5 rounded-lg border border-lh-red/30 text-lh-red text-[12px] font-semibold hover:bg-lh-red-bg transition-colors disabled:opacity-50"
    >
      {pending ? "Déconnexion…" : "Déconnecter"}
    </button>
  );
}
