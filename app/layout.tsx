import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lihtea — Plateforme commerciale",
    template: "%s · Lihtea",
  },
  description:
    "Plateforme commerciale Lihtea : prospection, CRM, séquences, simulateur.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
