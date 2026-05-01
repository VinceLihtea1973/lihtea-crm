import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-bg">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] bg-teal text-white font-black text-[18px]">
          L
        </div>
        <h1 className="mt-6 text-[28px] font-extrabold text-navy tracking-[-0.02em]">
          Page introuvable
        </h1>
        <p className="mt-2 text-[13px] text-text-2">
          Cette page n&apos;existe pas — ou elle sera construite dans une phase
          ultérieure.
        </p>
        <div className="mt-6">
          <Link href="/dashboard">
            <Button>Retour au dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
