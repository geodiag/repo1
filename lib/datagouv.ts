// ═══════════════════════════════════════════════════════════════════════════════
// Service data.gouv.fr — Accès aux jeux de données ouverts de l'État français
// ═══════════════════════════════════════════════════════════════════════════════
//
// Ce service encapsule les appels à l'API data.gouv.fr pour DiagX.
// Il est utilisé côté serveur (route API Next.js) pour enrichir les données ERP.
//
// API utilisées :
//   - API de recherche : https://www.data.gouv.fr/api/1/datasets/
//   - API tabulaire    : https://tabular-api.data.gouv.fr/api/resources/{id}/data/
//   - API dataset info : https://www.data.gouv.fr/api/1/datasets/{id}/
//
// Note : Le MCP server (https://mcp.data.gouv.fr/mcp) utilise ces mêmes API
//        en interne. Ce fichier fournit un accès direct pour l'app Next.js.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  DataGouvDataset,
  DataGouvSearchResponse,
  DataGouvTabularResponse,
  DataGouvResource,
} from './types';

const BASE_URL = 'https://www.data.gouv.fr/api/1';
const TABULAR_URL = 'https://tabular-api.data.gouv.fr/api/resources';

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Geodiag-SaaS/1.0',
};

// ── Recherche de datasets ────────────────────────────────────────────────────

/**
 * Recherche des jeux de données sur data.gouv.fr
 * Utile pour trouver les PPR d'une commune, les arrêtés préfectoraux, etc.
 *
 * @param query - Mots-clés de recherche (ex: "PPR inondation Paris")
 * @param pageSize - Nombre de résultats par page (défaut: 10)
 * @returns Liste paginée de datasets
 *
 * @example
 * const pprDatasets = await searchDatasets("plan prévention risques 75056");
 */
export async function searchDatasets(
  query: string,
  pageSize: number = 10
): Promise<DataGouvSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    page_size: String(pageSize),
  });

  const res = await fetch(`${BASE_URL}/datasets/?${params}`, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`❌ data.gouv.fr search error: ${res.status}`);
    return { data: [], next_page: null, page: 1, page_size: pageSize, total: 0 };
  }

  return res.json();
}

// ── Détails d'un dataset ─────────────────────────────────────────────────────

/**
 * Récupère les métadonnées complètes d'un jeu de données
 *
 * @param datasetId - ID ou slug du dataset
 * @returns Métadonnées complètes du dataset
 *
 * @example
 * const info = await getDatasetInfo("dpe-v2-logements-existants");
 */
export async function getDatasetInfo(
  datasetId: string
): Promise<DataGouvDataset | null> {
  const res = await fetch(`${BASE_URL}/datasets/${datasetId}/`, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`❌ data.gouv.fr dataset info error: ${res.status} for ${datasetId}`);
    return null;
  }

  return res.json();
}

// ── Liste des ressources d'un dataset ────────────────────────────────────────

/**
 * Liste les fichiers/ressources d'un jeu de données
 *
 * @param datasetId - ID ou slug du dataset
 * @returns Liste des ressources du dataset
 */
export async function listResources(
  datasetId: string
): Promise<DataGouvResource[]> {
  const dataset = await getDatasetInfo(datasetId);
  return dataset?.resources || [];
}

// ── Requête tabulaire (CSV/XLS via API) ──────────────────────────────────────

/**
 * Interroge les données tabulaires d'une ressource (CSV ou XLS ≤ 100 Mo)
 * C'est l'équivalent programmatique de `query_resource_data` du MCP server.
 *
 * @param resourceId - ID de la ressource (fichier dans le dataset)
 * @param params - Paramètres de filtrage (colonnes, valeurs, pagination)
 * @returns Données tabulaires paginées
 *
 * @example
 * // Chercher les DPE d'un code INSEE
 * const data = await queryResource("resource-uuid", {
 *   "code_insee_commune__exact": "75056",
 *   "page_size": "5"
 * });
 */
export async function queryResource(
  resourceId: string,
  params?: Record<string, string>
): Promise<DataGouvTabularResponse> {
  const searchParams = new URLSearchParams(params || {});

  const res = await fetch(`${TABULAR_URL}/${resourceId}/data/?${searchParams}`, {
    headers: DEFAULT_HEADERS,
    cache: 'no-store',
  });

  if (!res.ok) {
    console.error(`❌ data.gouv.fr tabular query error: ${res.status} for ${resourceId}`);
    return { data: [], links: { next: null, prev: null }, meta: { page: 1, page_size: 20, total: 0 } };
  }

  return res.json();
}

// ── Datasets utiles pré-identifiés pour DiagX ────────────────────────────────
// Ces IDs sont stables et correspondent aux jeux de données officiels

export const DATASETS = {
  /** Base DPE logements existants (ADEME) — année de construction, étiquette énergie */
  DPE_LOGEMENTS: 'dpe-v2-logements-existants',

  /** DVF — Demandes de Valeurs Foncières (transactions immobilières) */
  DVF: 'demandes-de-valeurs-foncieres',

  /** Base adresse nationale (BAN) */
  BAN: 'adresses-nationales',

  /** Plans de Prévention des Risques Naturels */
  PPR_NATURELS: 'plans-de-prevention-des-risques-naturels-pprn',

  /** Plans de Prévention des Risques Technologiques */
  PPR_TECHNO: 'plans-de-prevention-des-risques-technologiques-pprt',

  /** BASIAS — Anciens sites industriels et activités de service */
  BASIAS: 'base-des-anciens-sites-industriels-et-activites-de-service-basias',

  /** BASOL — Sites et sols pollués */
  BASOL: 'sites-et-sols-pollues-ou-potentiellement-pollues-basol',

  /** Installations classées (ICPE) */
  ICPE: 'installations-classees-pour-la-protection-de-l-environnement-icpe',
} as const;

// ── Fonctions utilitaires spécifiques DiagX ──────────────────────────────────

/**
 * Recherche les PPR (Plans de Prévention des Risques) pour une commune
 * via data.gouv.fr. Complémentaire aux données GASPAR de Géorisques.
 *
 * @param codeInsee - Code INSEE de la commune
 * @returns Datasets PPR liés à la commune
 */
export async function searchPPRParCommune(
  codeInsee: string
): Promise<DataGouvDataset[]> {
  const result = await searchDatasets(`plan prévention risques ${codeInsee}`, 5);
  return result.data;
}

/**
 * Recherche des informations sur les anciens sites industriels (BASIAS)
 * à proximité d'une commune. Utile pour les SIS.
 *
 * @param codeInsee - Code INSEE de la commune
 */
export async function searchSitesIndustrielsParCommune(
  codeInsee: string
): Promise<DataGouvDataset[]> {
  const result = await searchDatasets(`sites industriels sols pollués ${codeInsee}`, 5);
  return result.data;
}
