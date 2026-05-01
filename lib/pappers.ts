/**
 * Client Pappers API v2
 * Doc : https://www.pappers.fr/api/documentation
 *
 * Fonctions exposées :
 *   searchPappers(query)          — recherche par raison sociale
 *   searchByDirector(name)        — recherche par nom de dirigeant
 *   enrichFromSiren(siren)        — fiche complète d'une entreprise
 */

const BASE = "https://api.pappers.fr/v2";

function apiKey(): string {
  const k = process.env.PAPPERS_API_KEY;
  if (!k) throw new Error("PAPPERS_API_KEY manquante dans les variables d'environnement");
  return k;
}

// ─── Types publics ────────────────────────────────────────────────

export type PappersCompany = {
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
  revenueM:      number | null;  // CA en M€
  revenueYear:   number | null;
  creationDate:  Date   | null;
  isActive:      boolean;
  dirigeants:    PappersDirecteur[];
};

export type PappersDirecteur = {
  nom:       string;
  prenom:    string | null;
  qualite:   string;  // "Président", "Gérant", etc.
  dateNaiss: string | null;
};

export type PappersDirectorSearchResult = {
  total:    number;
  results:  PappersDirectorHit[];
};

export type PappersDirectorHit = {
  nom:       string;
  prenom:    string | null;
  qualite:   string;
  entreprises: {
    siren:     string;
    nom:       string;
    legalForm: string | null;
    apeCode:   string | null;
    city:      string | null;
    isActive:  boolean;
  }[];
};

// ─── Mapping raw Pappers ──────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCompany(raw: any): PappersCompany {
  const siege = raw.siege ?? {};
  const finances = (raw.finances ?? []).sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => (b.annee ?? 0) - (a.annee ?? 0)
  );
  const lastFinance = finances[0];

  return {
    siren:         raw.siren ?? "",
    siret:         siege.siret ?? null,
    name:          raw.nom_entreprise ?? raw.nom ?? "—",
    legalForm:     raw.forme_juridique ?? null,
    apeCode:       raw.code_naf ?? null,
    headcountBand: raw.tranche_effectif ?? null,
    region:        siege.region ?? null,
    department:    siege.departement ?? null,
    city:          siege.ville ?? null,
    postalCode:    siege.code_postal ?? null,
    address:       siege.adresse_ligne_1 ?? null,
    website:       raw.site_web ?? null,
    revenueM:      lastFinance?.chiffre_affaires
      ? Math.round((lastFinance.chiffre_affaires / 1_000_000) * 100) / 100
      : null,
    revenueYear:   lastFinance?.annee ?? null,
    creationDate:  raw.date_creation ? new Date(raw.date_creation) : null,
    isActive:      raw.statut === "A" || raw.etat_administratif === "A",
    dirigeants:    (raw.dirigeants ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any): PappersDirecteur => ({
        nom:       d.nom ?? "",
        prenom:    d.prenom ?? null,
        qualite:   d.qualite ?? "",
        dateNaiss: d.date_de_naissance_formate ?? null,
      })
    ),
  };
}

// ─── Recherche par raison sociale ────────────────────────────────

export async function searchPappers(
  query: string,
  page = 1,
  pageSize = 20
): Promise<{ total: number; results: PappersCompany[] }> {
  const params = new URLSearchParams({
    api_token:      apiKey(),
    q:              query,
    par_page:       String(pageSize),
    page:           String(page),
    precision:      "standard",
  });

  const res = await fetch(`${BASE}/recherche?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pappers recherche erreur ${res.status}: ${text}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  return {
    total:   data.total ?? 0,
    results: (data.resultats ?? []).map(mapCompany),
  };
}

// ─── Recherche par dirigeant ──────────────────────────────────────

export async function searchByDirector(
  name: string,
  page = 1,
  pageSize = 20
): Promise<PappersDirectorSearchResult> {
  const params = new URLSearchParams({
    api_token: apiKey(),
    q:         name,
    par_page:  String(pageSize),
    page:      String(page),
  });

  const res = await fetch(`${BASE}/recherche-dirigeants?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pappers dirigeants erreur ${res.status}: ${text}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: PappersDirectorHit[] = (data.resultats ?? []).map((hit: any) => ({
    nom:    hit.nom ?? "",
    prenom: hit.prenom ?? null,
    qualite: hit.qualite ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entreprises: (hit.entreprises ?? []).map((e: any) => ({
      siren:     e.siren ?? "",
      nom:       e.nom_entreprise ?? e.nom ?? "—",
      legalForm: e.forme_juridique ?? null,
      apeCode:   e.code_naf ?? null,
      city:      e.siege?.ville ?? null,
      isActive:  e.statut === "A" || e.etat_administratif === "A",
    })),
  }));

  return {
    total:   data.total ?? results.length,
    results,
  };
}

// ─── Enrichissement depuis SIREN ─────────────────────────────────

export async function enrichFromSiren(siren: string): Promise<PappersCompany> {
  const params = new URLSearchParams({
    api_token:    apiKey(),
    siren,
    champs:       "siege,dirigeants,finances,forme_juridique,code_naf,tranche_effectif,site_web,date_creation,statut",
  });

  const res = await fetch(`${BASE}/entreprise?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pappers enrichissement erreur ${res.status}: ${text}`);
  }
  const data = await res.json();
  return mapCompany(data);
}
