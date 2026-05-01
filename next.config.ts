import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactive le double-rendu de StrictMode en dev — évite les requêtes API en doublon
  reactStrictMode: false,
  experimental: {
    typedRoutes: true,
  },
  // On autorise les images distantes si besoin de logos d'entreprise plus tard.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
