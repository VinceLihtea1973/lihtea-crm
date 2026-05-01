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

/* Script inline exécuté AVANT le rendu — évite le flash de thème */
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('lihtea-theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
