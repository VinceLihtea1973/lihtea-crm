/**
 * Moteur de scoring ICP — pur, sans IO.
 *
 * Convention : la somme des poids max d'un profil vaut exactement 100,
 * donc le score gagné par une company se lit directement sur 100.
 *
 * Le profil par défaut est calibré pour la cible Lihtea :
 *   - APE         max 30 pts (hôtellerie/logistique > services)
 *   - Effectifs   max 30 pts (1000+ > 250-999 > 50-249 > 10-49)
 *   - CA          max 25 pts (≥200M > 100-200M > 50-100M > 20-50M > <20M)
 *   - Région      max 15 pts (IDF/PACA/AURA > autres)
 *
 * Persistable en base via List.filtersJson ou TenantSettings (futur).
 */

export type IcpProfile = {
  apeBuckets:     { code: string; weight: number; label: string }[];
  headcountBands: { band: string; weight: number }[];
  revenueBuckets: { min: number; max?: number; weight: number; label: string }[];
  regions:        { region: string; weight: number }[];
  thresholds:     { hot: number; warm: number };
};

export const DEFAULT_ICP_PROFILE: IcpProfile = {
  apeBuckets: [
    { code: "hotel",      weight: 30, label: "Hôtellerie" },
    { code: "logistique", weight: 28, label: "Logistique" },
    { code: "retail",     weight: 25, label: "Distribution" },
    { code: "industrie",  weight: 22, label: "Industrie" },
    { code: "immo",       weight: 18, label: "Immobilier" },
    { code: "services",   weight: 15, label: "Services" },
  ],
  headcountBands: [
    { band: "1000+",   weight: 30 },
    { band: "250-999", weight: 28 },
    { band: "50-249",  weight: 22 },
    { band: "10-49",   weight: 12 },
  ],
  revenueBuckets: [
    { min: 200,           weight: 25, label: "≥ 200 M€" },
    { min: 100, max: 200, weight: 22, label: "100–200 M€" },
    { min: 50,  max: 100, weight: 18, label: "50–100 M€" },
    { min: 20,  max: 50,  weight: 12, label: "20–50 M€" },
    { min: 0,   max: 20,  weight: 5,  label: "< 20 M€" },
  ],
  regions: [
    { region: "Île-de-France",              weight: 15 },
    { region: "Provence-Alpes-Côte d'Azur", weight: 13 },
    { region: "Auvergne-Rhône-Alpes",       weight: 12 },
    { region: "Nouvelle-Aquitaine",         weight: 10 },
    { region: "Hauts-de-France",            weight: 9  },
    { region: "Occitanie",                  weight: 9  },
    { region: "Pays de la Loire",           weight: 8  },
  ],
  thresholds: { hot: 80, warm: 60 },
};

export type IcpInput = {
  nafBucket?:     string | null;
  headcountBand?: string | null;
  revenueM?:      number | null;
  region?:        string | null;
};

export type IcpBreakdownLine = {
  factor:  "APE" | "Effectifs" | "CA" | "Région";
  gained:  number;       // points effectivement gagnés
  max:     number;       // points max possibles sur ce facteur
  reason:  string;       // texte explicatif court
  matched: boolean;      // true si la règle a matché
};

export type IcpResult = {
  score:     number;                      // 0-100
  band:      "HOT" | "WARM" | "COLD";
  breakdown: IcpBreakdownLine[];
};

function maxOf<T>(arr: T[], pick: (x: T) => number): number {
  return arr.reduce((m, x) => Math.max(m, pick(x)), 0);
}

/**
 * Calcule le score ICP d'une entreprise selon le profil donné.
 * Le score est arrondi à l'entier le plus proche, plafonné à 100.
 */
export function calculateIcp(
  input: IcpInput,
  profile: IcpProfile = DEFAULT_ICP_PROFILE
): IcpResult {
  const breakdown: IcpBreakdownLine[] = [];

  // — APE —
  const apeMax = maxOf(profile.apeBuckets, (b) => b.weight);
  const apeHit = profile.apeBuckets.find((b) => b.code === input.nafBucket);
  breakdown.push({
    factor:  "APE",
    gained:  apeHit?.weight ?? 0,
    max:     apeMax,
    reason:  apeHit
      ? `${apeHit.label} — secteur cible (${apeHit.weight} pts)`
      : input.nafBucket
        ? `${input.nafBucket} — hors cibles principales`
        : "APE non renseigné",
    matched: !!apeHit,
  });

  // — Effectifs —
  const hcMax = maxOf(profile.headcountBands, (b) => b.weight);
  const hcHit = profile.headcountBands.find((b) => b.band === input.headcountBand);
  breakdown.push({
    factor:  "Effectifs",
    gained:  hcHit?.weight ?? 0,
    max:     hcMax,
    reason:  hcHit
      ? `Tranche ${hcHit.band} salariés`
      : input.headcountBand
        ? `Tranche ${input.headcountBand} hors cible`
        : "Effectifs non renseignés",
    matched: !!hcHit,
  });

  // — CA —
  const caMax = maxOf(profile.revenueBuckets, (b) => b.weight);
  let caHit: typeof profile.revenueBuckets[number] | undefined;
  if (typeof input.revenueM === "number") {
    caHit = profile.revenueBuckets.find(
      (b) => input.revenueM! >= b.min && (b.max === undefined || input.revenueM! < b.max)
    );
  }
  breakdown.push({
    factor:  "CA",
    gained:  caHit?.weight ?? 0,
    max:     caMax,
    reason:  caHit
      ? `CA ${caHit.label}`
      : typeof input.revenueM === "number"
        ? `CA ${input.revenueM} M€ — hors plages cibles`
        : "CA non renseigné",
    matched: !!caHit,
  });

  // — Région —
  const regMax = maxOf(profile.regions, (r) => r.weight);
  const regHit = profile.regions.find((r) => r.region === input.region);
  breakdown.push({
    factor:  "Région",
    gained:  regHit?.weight ?? 0,
    max:     regMax,
    reason:  regHit
      ? `${regHit.region}`
      : input.region
        ? `${input.region} — hors régions cibles`
        : "Région non renseignée",
    matched: !!regHit,
  });

  const totalGained = breakdown.reduce((s, l) => s + l.gained, 0);
  const totalMax    = breakdown.reduce((s, l) => s + l.max, 0);
  const score       = totalMax === 0
    ? 0
    : Math.min(100, Math.round((totalGained / totalMax) * 100));

  const band: IcpResult["band"] =
    score >= profile.thresholds.hot  ? "HOT"  :
    score >= profile.thresholds.warm ? "WARM" :
    "COLD";

  return { score, band, breakdown };
}

/**
 * Détermine le bucket NAF interne à partir d'un code APE INSEE (5 caractères).
 * Permet de standardiser les codes APE retournés par Sirene vers nos buckets ICP.
 */
export function nafBucketFromApe(ape: string | null | undefined): string | null {
  if (!ape) return null;
  const code = ape.replace(/[^0-9A-Z]/g, "").slice(0, 4); // ex: "5510Z" → "5510"
  // 55.xx — Hébergement
  if (code.startsWith("551") || code.startsWith("552")) return "hotel";
  // 47.xx — Commerce de détail
  if (code.startsWith("47")) return "retail";
  // 52.29 / 52.10 — Logistique / entreposage
  if (code.startsWith("521") || code.startsWith("522") || code.startsWith("493")) return "logistique";
  // 10–33 — Industrie manufacturière (hors agro/textile pure)
  const n = parseInt(code.slice(0, 2), 10);
  if (n >= 10 && n <= 33) return "industrie";
  // 68.xx — Immobilier
  if (code.startsWith("68")) return "immo";
  // 80–82 — Services aux entreprises
  if (n >= 80 && n <= 82) return "services";
  return null;
}

/**
 * Map une tranche d'effectifs INSEE (code) vers nos buckets internes.
 * Ref : https://www.sirene.fr/sirene/public/variable/tefen
 */
export function headcountBandFromInsee(tefenCode: string | null | undefined): string | null {
  if (!tefenCode) return null;
  switch (tefenCode) {
    case "00":              // 0 salarié
    case "01":              // 1-2
    case "02":              // 3-5
    case "03":              // 6-9
      return "1-9";
    case "11":              // 10-19
    case "12":              // 20-49
      return "10-49";
    case "21":              // 50-99
    case "22":              // 100-199
    case "31":              // 200-249
      return "50-249";
    case "32":              // 250-499
    case "41":              // 500-999
      return "250-999";
    case "42":              // 1000-1999
    case "51":              // 2000-4999
    case "52":              // 5000-9999
    case "53":              // 10000+
      return "1000+";
    default:
      return null;
  }
}
