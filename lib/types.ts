// ═══════════════════════════════════════════════════════════════════════════════
// Types centralisés — DiagX / Géodiag
// ═══════════════════════════════════════════════════════════════════════════════

// ── Données ERP (État des Risques et Pollutions) ────────────────────────────

export interface DvfTransaction {
  date: string;
  prix: number;
  surface: number | null;
  type: string;
  prixM2: number | null;
}

export interface BruitAerodrome {
  nom: string;
  codePEB: string;
}

/** Détail d'un Secteur d'Information sur les Sols (SIS) */
export interface SisDetail {
  nom: string;
  description: string;
}

/** Installation Classée pour la Protection de l'Environnement (ICPE) à proximité */
export interface IcpeProximite {
  nom: string;
  regime: string;
  distance: number;
}

/** Mouvement de terrain détecté */
export interface MvtDetail {
  type: string;
  date: string;
}

/**
 * Objet complet des risques retourné par /api/georisques
 * Utilisé côté front (AddressSearch, Espace) et côté PDF
 */
export interface ErpData {
  // ── Risques existants ──────────────────────────────────────────────────────
  inondation: boolean;
  technologique: boolean;
  sismicite: string;
  potentielRadon: string;
  nbCatnat: number;
  anneeConstruction: string;

  // ── Cadastre ───────────────────────────────────────────────────────────────
  parcelleSurface: string;
  parcelleRef: string;
  parcelleSection: string;
  parcelleNumero: string;
  parcelleCommune: string;
  parcelleGeoJSON: GeoJSONFeature | null;

  // ── PLU ────────────────────────────────────────────────────────────────────
  zonePLU: string;
  codeZonePLU: string;
  libelleZone: string;

  // ── DVF (transactions) ─────────────────────────────────────────────────────
  transactionsRecentes: DvfTransaction[];
  prixMoyen: string;

  // ── ENSA (bruit aérodromes) ────────────────────────────────────────────────
  ensaConcerne: boolean;
  ensaAerodromes: BruitAerodrome[];

  // ── NOUVEAUX : SIS, ICPE, MVT, Cavités ─────────────────────────────────────
  sisConcerne: boolean;
  sisDetails: SisDetail[];
  icpeConcerne: boolean;
  icpeProximite: IcpeProximite[];
  mvtConcerne: boolean;
  mvtDetails: MvtDetail[];
  cavitesConcerne: boolean;
  cavitesProximite: number;

  // ── BDNB (Base de Données Nationale des Bâtiments) ─────────────────────────
  batiment: BatimentInfo | null;
}

// ── BDNB — Données bâtiment enrichies ────────────────────────────────────────

/** Données bâtiment issues de la BDNB (croisement BD TOPO + Cadastre + DPE + Fichiers Fonciers) */
export interface BatimentInfo {
  id: string;                              // batiment_groupe_id BDNB
  anneeConstruction: number | null;
  anneeConstructionTranche: string | null; // "1945-1970", "Avant 1945", etc.
  typeBatiment: string;                    // "Résidentiel", "Tertiaire"
  nbLogements: number | null;
  surfaceHabitable: number | null;         // m²
  hauteurMoyenne: number | null;           // mètres
  materiauxMur: string | null;             // "Pierre", "Béton"
  dpeExistant: DpeExistant | null;
  geometry: GeoJSONFeature | null;         // Emprise au sol du bâtiment pour la carte
}

/** DPE existant récupéré via la BDNB */
export interface DpeExistant {
  classe: string | null;                   // "A" à "G"
  conso: number | null;                    // kWh/m²/an
  ges: string | null;                      // "A" à "G"
  date: string | null;                     // Date d'établissement
}

// ── GeoJSON simplifié ────────────────────────────────────────────────────────

export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: string;
    coordinates: number[][][] | number[][];
  };
  properties: Record<string, unknown>;
}

// ── data.gouv.fr — Types pour le service lib/datagouv.ts ─────────────────────

/** Résultat de recherche de datasets sur data.gouv.fr */
export interface DataGouvDataset {
  id: string;
  title: string;
  description: string;
  slug: string;
  organization: {
    name: string;
    logo: string;
  } | null;
  resources: DataGouvResource[];
  created_at: string;
  last_modified: string;
  frequency: string;
  tags: string[];
}

/** Ressource (fichier) dans un dataset data.gouv.fr */
export interface DataGouvResource {
  id: string;
  title: string;
  description: string;
  url: string;
  format: string;
  filesize: number | null;
  mime: string;
  created_at: string;
  last_modified: string;
}

/** Réponse paginée de l'API de recherche data.gouv.fr */
export interface DataGouvSearchResponse {
  data: DataGouvDataset[];
  next_page: string | null;
  page: number;
  page_size: number;
  total: number;
}

/** Réponse de l'API tabulaire data.gouv.fr */
export interface DataGouvTabularResponse {
  data: Record<string, unknown>[];
  links: {
    next: string | null;
    prev: string | null;
  };
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
}

// ── Géorisques — Types de réponses API ───────────────────────────────────────

export interface GeorisquesBaseResponse {
  data: Record<string, unknown>[];
  total?: number;
  page?: number;
}

export interface GeorisquesGeoResponse {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
