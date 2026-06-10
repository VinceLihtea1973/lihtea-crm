/**
 * Client Data.gouv.fr — deux sources :
 *
 * 1. recherche-entreprises.api.gouv.fr
 *    Recherche libre d'entreprises (agrège INSEE, INPI, URSSAF).
 *    Pas de clé API requise.
feat: filtres Data.gouv parallèles + filtre CA (TPE/PME/ETI/GE) * 2. BODACC (bodacc-datadila.opendatasoft.com)
 *    Annonces légales officielles : créations, cessions, procédures,
 *    modifications, radiations.
 *    Pas de clé API requise.
 */

// ─── Types ───────────────────────────────────────────────────────

export type DatagouvCompany = {
  siren:         string;
  siret:         string | null;
  name:          string;
  legalForm:     string | null;
  apeCode:       string | null;
  headcountBand: string | null;
  region:        string | null;
  department:    string | null;
  city:          string | null;
  postalCode:    string | null;
  address:       string | null;
  website:       string | null;
  isActive:      boolean;
  dirigeants:    { nom: string; prenom: string | null; qualite: string }[];
};

export type BodaccSignalType =
  | "CREATION"
  | "VENTE"
  | "MODIFICATION"
  | "RADIATION"
  | "PROCEDURE_COLLECTIVE"
  | "DEPOT_COMPTES"
  | "AUTRE";

export type BodaccSignal = {
  id:          string;
  siren:       string;
  companyName: string;
  type:        BodaccSignalType;
  typeLabel:   string;
  date:        Date;
  tribunal:    string | null;
  detail:      string | null;
  url:         string | null;
};

// ─── Recherche entreprises ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRechercheEntreprise(r: any): DatagouvCompany {
  const siege = r.siege ?? {};
  return {
    siren:         r.siren ?? "",
    siret:         siege.siret ?? null,
    name:          r.nom_complet ?? r.nom_raison_sociale ?? "—",
    legalForm:     r.nature_juridique ?? null,
    apeCode:       r.activite_principale ?? null,
    headcountBand: r.tranche_effectif_salarie ?? null,
    region:        siege.libelle_region ?? null,
    department:    siege.departement ?? null,
    city:          siege.libelle_commune ?? null,
    postalCode:    siege.code_postal ?? null,
    address:       [siege.numero_voie, siege.type_voie, siege.libelle_voie]
                     .filter(Boolean).join(" ") || null,
    website:       null, // pas exposé par cette API
    isActive:      r.etat_administratif === "A",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dirigeants: (r.dirigeants ?? []).map((d: any) => ({
      nom:     d.nom ?? "",
      prenom:  d.prenoms ?? null,
      qualite: d.qualite ?? "",
    })),
  };
}

/** Région (libellé) → code INSEE région pour l'API Data.gouv */
export const REGION_TO_CODE: Record<string, string> = {
  "Île-de-France":              "11",
  "Centre-Val de Loire":        "24",
  "Bourgogne-Franche-Comté":    "27",
  "Normandie":                  "28",
  "Hauts-de-France":            "32",
  "Grand Est":                  "44",
  "Pays de la Loire":           "52",
  "Bretagne":                   "53",
  "Nouvelle-Aquitaine":         "75",
  "Occitanie":                  "76",
  "Auvergne-Rhône-Alpes":       "84",
  "Provence-Alpes-Côte d'Azur": "93",
  "Corse":                      "94",
  "Guadeloupe":                 "01",
  "Martinique":                 "02",
  "Guyane":                     "03",
  "La Réunion":                 "04",
  "Mayotte":                    "06",
};

/** Tranche effectif interne → premier code INSEE (pour Data.gouv qui n'accepte qu'une valeur) */
const BAND_TO_DG_CODE: Record<string, string> = {
  "1-9":    "03",
  "10-49":  "12",
  "50-249": "22",
  "250-999":"41",
  "1000+":  "53",
};

/** Normalise un code APE : "7111z" | "71.11z" → "71.11Z" */
/** Normalise un code APE : "7111z" | "71.11z" | "71.11.Z" → "71.11Z" */
function normalizeApe(raw: string): string {
  const cleaned = raw.replace(/[\s.]/g, "").toUpperCase();
  return /^\d{4}[A-Z]$/i.test(cleaned)
    ? `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`
    : raw.toUpperCase().trim();
}

/** Reconnaît un code APE quelle que soit la ponctuation : 46.52Z, 4652Z, 46.52.Z */
function isApeCode(s: string): boolean {
  return /^\d{4}[A-Z]$/i.test(s.replace(/[\s.]/g, ""));
}

const DATAGOUV_SEARCH = "https://recherche-entreprises.api.gouv.fr/search";

// Cache en mémoire serveur (10s) pour éviter les doubles requêtes en dev et les rafales
const _reqCache = new Map<string, { data: unknown; expires: number }>();

async function fetchWithRetry(
  url: string,
  retries = 3,
  delayMs = 600
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Lihtea-CRM/1.0" },
    });

    if (res.status === 429) {
      if (attempt < retries) {
        // Respect Retry-After si présent, sinon backoff exponentiel
        const retryAfter = res.headers.get("Retry-After");
        const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw new Error(
        "L'API Data.gouv est temporairement saturée (trop de requêtes). " +
        "Attendez quelques secondes puis réessayez."
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Erreur Data.gouv ${res.status} : ${text}`);
    }

    return res;
  }
  // Ne devrait jamais arriver
  throw new Error("Erreur Data.gouv inattendue");
}

export const FORME_TO_NATURE_JUR: Record<string,string> = {
  "SAS":"5710","SASU":"5710","SARL":"5499","EURL":"5498",
  "SA":"5505","SCI":"6540","SNC":"5202","EI":"1000","ASSOCIATION":"9220",
};
export const CATEGORIE_LABELS: Record<string,string> = {
  "TPE":"TPE — CA < 2 M€","PME":"PME — CA 2–50 M€",
  "ETI":"ETI — CA 50 M€–1,5 Md€","GE":"GE — CA > 1,5 Md€",
};
const BAND_TO_CODES: Record<string,string[]> = {
  "1-9":["00","01","02","03"],"10-49":["11","12"],
  "50-249":["21","22","31"],"250-999":["32","41"],"1000+":["42","51","52","53"],
};
export type DgFilters = {
  departments?:         string[];
  regions?:             string[];
  headcountBands?:      string[];
  categorieEntreprise?: string;
  formeJuridique?:      string;
};
export async function searchEntreprises(
  query: string, page = 1, perPage = 20, filters: DgFilters = {}
): Promise<{ total: number; results: DatagouvCompany[] }> {
  const q = query.trim();
  async function fetchSlice(regionCode?: string, dept?: string) {
    const p = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (isApeCode(q)) p.set("activite_principale", normalizeApe(q)); else p.set("q", q);
    if (dept)       p.set("departement", dept);
    if (regionCode) p.set("region", regionCode);
    if (filters.headcountBands?.length) { const c=BAND_TO_CODES[filters.headcountBands[0]]?.[0]; if(c) p.set("tranche_effectif_salarie",c); }
    if (filters.categorieEntreprise)   p.set("categorie_entreprise", filters.categorieEntreprise);
    if (filters.formeJuridique) { const c=FORME_TO_NATURE_JUR[filters.formeJuridique]; if(c) p.set("nature_juridique",c); }
    p.set("etat_administratif","A");
    const url = `${DATAGOUV_SEARCH}?${p.toString()}`;
    const cached = _reqCache.get(url);
    if (cached && cached.expires > Date.now()) {
      const d = cached.data as any; // eslint-disable-line
      return { total: d.total_results??0, results: (d.results??[]).map(mapRechercheEntreprise) };
    }
    const res  = await fetchWithRetry(url);
    const data = await res.json() as any; // eslint-disable-line
    _reqCache.set(url, { data, expires: Date.now()+10_000 });
    return { total: data.total_results??0, results: (data.results??[]).map(mapRechercheEntreprise) };
  }
  const regions = filters.regions?.length    ? filters.regions    : [undefined as string|undefined];
  const depts   = filters.departments?.length ? filters.departments : [undefined as string|undefined];
  if (regions.length<=1 && depts.length<=1)
    return fetchSlice(regions[0]?REGION_TO_CODE[regions[0]]:undefined, depts[0]);
  const combos: [string|undefined,string|undefined][] = [];
  for (const r of regions.slice(0,4)) for (const d of depts.slice(0,4)) combos.push([r?REGION_TO_CODE[r]:undefined,d]);
  const pages = await Promise.all(combos.map(([r,d])=>fetchSlice(r,d)));
  const seen = new Set<string>();
  const merged = pages.flatMap(p=>p.results).filter(r=>{ if(seen.has(r.siren))return false; seen.add(r.siren);return true; });
  return { total: pages.reduce((s,p)=>s+p.total,0), results: merged.slice(0,perPage) };
}

export async function fetchBodaccForSirens(
  sirens: string[],
  daysBack = 90,
  limit = 50
): Promise<BodaccSignal[]> {
  if (sirens.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceStr = since.toISOString().split("T")[0];

  // On batch par groupe de 20 SIRENs max pour rester dans les limites de l'URL
  const chunks: string[][] = [];
  for (let i = 0; i < sirens.length; i += 20) {
    chunks.push(sirens.slice(i, i + 20));
  }

  const results: BodaccSignal[] = [];

  for (const chunk of chunks) {
    const sirenFilter = chunk
      .map((s) => `registre_du_commerce_numero_siren="${s}"`)
      .join(" OR ");

    const params = new URLSearchParams({
      where:    `(${sirenFilter}) AND dateparution >= date'${sinceStr}'`,
      order_by: "dateparution desc",
      limit:    String(limit),
    });

    const res = await fetch(`${BODACC_BASE}?${params}`, { cache: "no-store" });
    if (!res.ok) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    results.push(...(data.results ?? []).map(mapBodacc));
  }

  // Tri global par date desc
  return results
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

/** Recherche BODACC par nom de société (pour signaux sans SIREN connu) */
export async function fetchBodaccByName(
  name: string,
  limit = 20
): Promise<BodaccSignal[]> {
  const params = new URLSearchParams({
    where:    `search(commercant, "${name.replace(/"/g, "")}")`,
    order_by: "dateparution desc",
    limit:    String(limit),
  });

  const res = await fetch(`${BODACC_BASE}?${params}`, { cache: "no-store" });
  if (!res.ok) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();
  return (data.results ?? []).map(mapBodacc);
}
