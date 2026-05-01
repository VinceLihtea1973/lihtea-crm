/**
 * Client INSEE Sirene v3.11 — recherche d'entreprises pour la prospection.
 *
 * API  : https://api.insee.fr/api-sirene/3.11/siret
 * Auth : Clé API (header X-Gravitee-Api-Key) — portail-api.insee.fr
 *
 * Variables d'env :
 *   INSEE_API_KEY   clé obtenue après souscription sur portail-api.insee.fr
 *
 * Mode dégradé : si la clé est absente, retourne des résultats fictifs.
 */

import { headcountBandFromInsee, nafBucketFromApe } from "@/lib/icp";

const SIRENE_BASE = "https://api.insee.fr";
const SIRET_PATH  = "/api-sirene/3.11/siret";

function inseeCredsAvailable(): boolean {
  return !!process.env.INSEE_API_KEY;
}

function inseeApiKey(): string {
  return process.env.INSEE_API_KEY!;
}

// ─── Types publics ─────────────────────────────────────────────────

export type SireneSearchInput = {
  query?:         string;          // raison sociale ou mot-clé
  apeBuckets?:    string[];        // ["hotel", "retail"…] - filtre côté nous via nafBucket
  apeCodes?:      string[];        // ["5510Z", "4711D"]  - filtre côté API
  headcountBands?: string[];       // ["50-249", "1000+"]
  regions?:       string[];        // ["Île-de-France"…]
  page?:          number;          // 1-based
  pageSize?:      number;          // défaut 20, max 100
};

export type SireneCompany = {
  siren:               string;
  siret:               string;        // établissement siège
  name:                string;
  apeCode:             string | null;
  nafBucket:           string | null;
  legalForm:           string | null;
  legalFormCode:       string | null;
  headcountBand:       string | null;
  headcountBandInsee:  string | null;
  region:              string | null;
  department:          string | null;
  city:                string | null;
  postalCode:          string | null;
  address:             string | null;
  creationDate:        Date   | null;
  isActive:            boolean;
};

export type SireneSearchResult = {
  total:    number;
  page:     number;
  pageSize: number;
  results:  SireneCompany[];
  source:   "INSEE" | "MOCK";
};

// ─── Mapping INSEE → SireneCompany ────────────────────────────────

type RawEtablissement = {
  siren: string;
  siret: string;
  uniteLegale: {
    denominationUniteLegale?:        string | null;
    sigleUniteLegale?:               string | null;
    nomUniteLegale?:                 string | null;
    prenomUsuelUniteLegale?:         string | null;
    activitePrincipaleUniteLegale?:  string | null;
    categorieJuridiqueUniteLegale?:  string | null;
    trancheEffectifsUniteLegale?:    string | null;
    etatAdministratifUniteLegale?:   string | null;
    dateCreationUniteLegale?:        string | null;
  };
  adresseEtablissement: {
    numeroVoieEtablissement?:           string | null;
    typeVoieEtablissement?:             string | null;
    libelleVoieEtablissement?:          string | null;
    codePostalEtablissement?:           string | null;
    libelleCommuneEtablissement?:       string | null;
    libelleRegionEtablissement?:        string | null; // pas exposé directement, on déduit
    codeCommuneEtablissement?:          string | null;
  };
  etablissementSiege?: boolean;
  etatAdministratifEtablissement?: string | null;
};

// Région INSEE depuis code département (mapping minimal — étendre si besoin)
const DEPT_TO_REGION: Record<string, string> = {
  "75": "Île-de-France", "77": "Île-de-France", "78": "Île-de-France",
  "91": "Île-de-France", "92": "Île-de-France", "93": "Île-de-France",
  "94": "Île-de-France", "95": "Île-de-France",
  "13": "Provence-Alpes-Côte d'Azur", "06": "Provence-Alpes-Côte d'Azur",
  "83": "Provence-Alpes-Côte d'Azur", "84": "Provence-Alpes-Côte d'Azur",
  "04": "Provence-Alpes-Côte d'Azur", "05": "Provence-Alpes-Côte d'Azur",
  "69": "Auvergne-Rhône-Alpes", "01": "Auvergne-Rhône-Alpes",
  "07": "Auvergne-Rhône-Alpes", "26": "Auvergne-Rhône-Alpes",
  "38": "Auvergne-Rhône-Alpes", "42": "Auvergne-Rhône-Alpes",
  "43": "Auvergne-Rhône-Alpes", "63": "Auvergne-Rhône-Alpes",
  "73": "Auvergne-Rhône-Alpes", "74": "Auvergne-Rhône-Alpes",
  "33": "Nouvelle-Aquitaine", "16": "Nouvelle-Aquitaine",
  "17": "Nouvelle-Aquitaine", "19": "Nouvelle-Aquitaine",
  "23": "Nouvelle-Aquitaine", "24": "Nouvelle-Aquitaine",
  "40": "Nouvelle-Aquitaine", "47": "Nouvelle-Aquitaine",
  "59": "Hauts-de-France", "62": "Hauts-de-France",
  "02": "Hauts-de-France", "60": "Hauts-de-France", "80": "Hauts-de-France",
  "44": "Pays de la Loire", "49": "Pays de la Loire",
  "53": "Pays de la Loire", "72": "Pays de la Loire", "85": "Pays de la Loire",
};

function deptFromPostal(cp: string | null | undefined): string | null {
  if (!cp || cp.length < 2) return null;
  // Corse : 2A/2B sur le département, 20xxx sur le CP
  if (cp.startsWith("20")) return "20";
  return cp.slice(0, 2);
}

function nameOf(u: RawEtablissement["uniteLegale"]): string {
  return (
    u.denominationUniteLegale ||
    [u.prenomUsuelUniteLegale, u.nomUniteLegale].filter(Boolean).join(" ") ||
    u.sigleUniteLegale ||
    "—"
  ).trim();
}

function addressOf(a: RawEtablissement["adresseEtablissement"]): string | null {
  const parts = [
    a.numeroVoieEtablissement,
    a.typeVoieEtablissement,
    a.libelleVoieEtablissement,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function mapEtablissement(raw: RawEtablissement): SireneCompany {
  const ape  = raw.uniteLegale.activitePrincipaleUniteLegale ?? null;
  const dept = deptFromPostal(raw.adresseEtablissement.codePostalEtablissement);
  const region = dept ? (DEPT_TO_REGION[dept] ?? null) : null;

  return {
    siren:              raw.siren,
    siret:              raw.siret,
    name:               nameOf(raw.uniteLegale),
    apeCode:            ape,
    nafBucket:          nafBucketFromApe(ape),
    legalForm:          raw.uniteLegale.categorieJuridiqueUniteLegale ?? null,
    legalFormCode:      raw.uniteLegale.categorieJuridiqueUniteLegale ?? null,
    headcountBandInsee: raw.uniteLegale.trancheEffectifsUniteLegale ?? null,
    headcountBand:      headcountBandFromInsee(raw.uniteLegale.trancheEffectifsUniteLegale),
    region,
    department:         dept,
    city:               raw.adresseEtablissement.libelleCommuneEtablissement ?? null,
    postalCode:         raw.adresseEtablissement.codePostalEtablissement ?? null,
    address:            addressOf(raw.adresseEtablissement),
    creationDate:       raw.uniteLegale.dateCreationUniteLegale
      ? new Date(raw.uniteLegale.dateCreationUniteLegale)
      : null,
    isActive:           raw.uniteLegale.etatAdministratifUniteLegale === "A",
  };
}

// ─── Construction de la query INSEE ───────────────────────────────

/**
 * Construit le paramètre `q` de l'API INSEE.
 * Doc : https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3.11
 */
/** Normalise un code APE saisi : "7111z" | "71.11z" | "71.11Z" → "71.11Z" */
function normalizeApe(raw: string): string {
  const up = raw.toUpperCase().replace(/\s/g, "");
  if (up.length === 5 && !up.includes(".")) {
    return `${up.slice(0, 2)}.${up.slice(2)}`;
  }
  return up;
}

/** Vérifie si la chaîne ressemble à un code APE/NAF : 5 car. + lettre finale */
function isApeCode(s: string): boolean {
  return /^\d{2}\.?\d{2}[A-Z]$/i.test(s.replace(/\s/g, ""));
}

function buildQuery(input: SireneSearchInput): string {
  const parts: string[] = [];

  if (input.query) {
    const q = input.query.trim();
    const qDigits = q.replace(/\s/g, "");

    if (/^\d{14}$/.test(qDigits)) {
      // SIRET (14 chiffres) → on recherche par SIREN (9 premiers)
      parts.push(`siren:${qDigits.slice(0, 9)}`);
    } else if (/^\d{9}$/.test(qDigits)) {
      // SIREN (9 chiffres)
      parts.push(`siren:${qDigits}`);
    } else if (isApeCode(q)) {
      // Code APE/NAF ex : 7111Z, 71.11Z, 55.10Z
      const ape = normalizeApe(q);
      parts.push(`activitePrincipaleUniteLegale:"${ape}"`);
    } else if (q.length) {
      // Raison sociale / mot-clé libre
      const escaped = q.replace(/"/g, '\\"');
      parts.push(`(denominationUniteLegale:"*${escaped}*" OR nomUniteLegale:"*${escaped}*")`);
    }
  }

  if (input.apeCodes?.length) {
    const apes = input.apeCodes.map((c) => `"${c}"`).join(" OR ");
    parts.push(`activitePrincipaleUniteLegale:(${apes})`);
  }

  // Filtres "états administratif actif" + "siège uniquement"
  parts.push(`etatAdministratifUniteLegale:A`);
  parts.push(`etablissementSiege:true`);

  return parts.join(" AND ");
}

// ─── Recherche réelle ─────────────────────────────────────────────

async function searchInseeLive(input: SireneSearchInput): Promise<SireneSearchResult> {
  const params = new URLSearchParams();
  params.set("q", buildQuery(input));
  params.set("nombre", String(Math.min(100, Math.max(1, input.pageSize ?? 20))));
  params.set("debut",  String(((input.page ?? 1) - 1) * (input.pageSize ?? 20)));

  const siretUrl = `${SIRENE_BASE}${SIRET_PATH}?${params.toString()}`;
  const res = await fetch(siretUrl, {
    headers: {
      "X-INSEE-Api-Key-Integration": inseeApiKey(),
      Accept:               "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) {
      return { total: 0, page: input.page ?? 1, pageSize: input.pageSize ?? 20, results: [], source: "INSEE" };
    }
    if (res.status === 429) {
      throw new Error("L'API INSEE Sirene est temporairement saturée. Attendez quelques secondes puis réessayez.");
    }
    const text = await res.text();
    throw new Error(`INSEE search error ${res.status} : ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    header: { total: number; debut: number; nombre: number };
    etablissements: RawEtablissement[];
  };

  let results = data.etablissements.map(mapEtablissement);

  // Filtres post-API (que l'INSEE n'expose pas directement)
  if (input.headcountBands?.length) {
    results = results.filter(
      (r) => r.headcountBand && input.headcountBands!.includes(r.headcountBand)
    );
  }
  if (input.regions?.length) {
    results = results.filter(
      (r) => r.region && input.regions!.includes(r.region)
    );
  }
  if (input.apeBuckets?.length) {
    results = results.filter(
      (r) => r.nafBucket && input.apeBuckets!.includes(r.nafBucket)
    );
  }

  return {
    total:    data.header.total,
    page:     input.page ?? 1,
    pageSize: input.pageSize ?? 20,
    results,
    source:   "INSEE",
  };
}

// ─── Mode mock (sans creds) ───────────────────────────────────────

const MOCK_DATA: SireneCompany[] = [
  {
    siren: "542065479", siret: "54206547900015", name: "Accor SA",
    apeCode: "5510Z", nafBucket: "hotel", legalForm: "5710", legalFormCode: "5710",
    headcountBandInsee: "53", headcountBand: "1000+",
    region: "Île-de-France", department: "92", city: "Issy-les-Moulineaux",
    postalCode: "92130", address: "82 RUE HENRI FARMAN",
    creationDate: new Date("1983-01-01"), isActive: true,
  },
  {
    siren: "552032534", siret: "55203253400543", name: "Casino Guichard-Perrachon",
    apeCode: "4711F", nafBucket: "retail", legalForm: "5710", legalFormCode: "5710",
    headcountBandInsee: "53", headcountBand: "1000+",
    region: "Auvergne-Rhône-Alpes", department: "42", city: "Saint-Étienne",
    postalCode: "42000", address: "1 ESPLANADE DE FRANCE",
    creationDate: new Date("1898-08-02"), isActive: true,
  },
  {
    siren: "552120222", siret: "55212022200187", name: "STEF Transport",
    apeCode: "5229B", nafBucket: "logistique", legalForm: "5710", legalFormCode: "5710",
    headcountBandInsee: "52", headcountBand: "1000+",
    region: "Île-de-France", department: "75", city: "Paris",
    postalCode: "75008", address: "93 BOULEVARD MALESHERBES",
    creationDate: new Date("1920-04-15"), isActive: true,
  },
  {
    siren: "388149015", siret: "38814901500035", name: "Bocage Hôtels",
    apeCode: "5510Z", nafBucket: "hotel", legalForm: "5599", legalFormCode: "5599",
    headcountBandInsee: "21", headcountBand: "50-249",
    region: "Pays de la Loire", department: "44", city: "Nantes",
    postalCode: "44000", address: "12 PLACE GRASLIN",
    creationDate: new Date("1992-06-12"), isActive: true,
  },
  {
    siren: "412844122", siret: "41284412200027", name: "Logiparc Méditerranée",
    apeCode: "5210B", nafBucket: "logistique", legalForm: "5499", legalFormCode: "5499",
    headcountBandInsee: "32", headcountBand: "250-999",
    region: "Provence-Alpes-Côte d'Azur", department: "13", city: "Vitrolles",
    postalCode: "13127", address: "ZI DE COUPERIGNE",
    creationDate: new Date("1997-09-01"), isActive: true,
  },
];

function searchInseeMock(input: SireneSearchInput): SireneSearchResult {
  const q = (input.query ?? "").trim();
  const qd = q.replace(/\s/g, "");
  let results = MOCK_DATA.slice();

  if (q) {
    if (/^\d{14}$/.test(qd)) {
      results = results.filter((r) => r.siret === qd || r.siren === qd.slice(0, 9));
    } else if (/^\d{9}$/.test(qd)) {
      results = results.filter((r) => r.siren === qd);
    } else if (isApeCode(q)) {
      const norm = normalizeApe(q);
      results = results.filter((r) =>
        r.apeCode ? normalizeApe(r.apeCode) === norm : false
      );
    } else {
      results = results.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
    }
  }
  if (input.apeBuckets?.length) {
    results = results.filter((r) => r.nafBucket && input.apeBuckets!.includes(r.nafBucket));
  }
  if (input.headcountBands?.length) {
    results = results.filter((r) => r.headcountBand && input.headcountBands!.includes(r.headcountBand));
  }
  if (input.regions?.length) {
    results = results.filter((r) => r.region && input.regions!.includes(r.region));
  }
  return {
    total:    results.length,
    page:     input.page ?? 1,
    pageSize: input.pageSize ?? 20,
    results,
    source:   "MOCK",
  };
}

// ─── Entrée publique ──────────────────────────────────────────────

/**
 * Recherche d'établissements siège dans la base Sirene.
 * Bascule en mode mock si aucune cred INSEE n'est configurée.
 */
export async function searchSirene(input: SireneSearchInput): Promise<SireneSearchResult> {
  if (!inseeCredsAvailable()) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[insee] INSEE_CLIENT_ID / INSEE_CLIENT_SECRET absents — bascule en mode MOCK."
      );
    }
    return searchInseeMock(input);
  }
  return searchInseeLive(input);
}
