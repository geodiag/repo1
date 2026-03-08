// ═══════════════════════════════════════════════════════════════════════════════
// Client API BDNB — Base de Données Nationale des Bâtiments
// https://api.bdnb.io/docs
//
// Intérêt pour DiagX :
//  - Année de construction PLUS FIABLE que l'ADEME seule (croisement BD TOPO + Cadastre + DPE)
//  - Géométrie du bâtiment pour la carte (emprise au sol)
//  - Nombre de logements (utile pour l'upsell DPE collectif)
//  - DPE existant (permet un upsell intelligent : "Votre DPE date de 2018, il faut le refaire")
//  - Matériaux de construction (contexte supplémentaire pour le rapport)
// ═══════════════════════════════════════════════════════════════════════════════

import type { BatimentInfo } from './types';

// ── Endpoint réel de l'API publique BDNB (OpenAPI v0) ────────────────────────
// Documentation : https://api.bdnb.io/docs
// L'API v0 expose les groupes de bâtiments avec filtre géographique PostGIS.
// Le filtre `geom_groupe` utilise la fonction ST_DWithin de PostGIS :
//   geom_groupe=st_dwithin(geom_groupe,st_setsrid(st_point(lng,lat),4326)::geography,50)
// Référence champs : batiment_groupe_id, annee_construction, usage_niveau_1_txt,
//                    nb_logements, s_geom_groupe, hauteur_mean, materiaux_structure_mur_txt
//                    conso_energie_primaire, classe_conso_energie, classe_estimation_ges
const BDNB_BASE_URL = 'https://api.bdnb.io/v0';

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Geodiag-SaaS/1.0',
};

/**
 * Recherche un bâtiment par coordonnées GPS dans la BDNB.
 * Utilise l'endpoint v0/batiment_groupe avec filtre spatial ST_DWithin (50m).
 *
 * La BDNB croise les données de :
 *  - BD TOPO (IGN) → géométrie, hauteur
 *  - Cadastre → parcelle
 *  - DPE (ADEME) → classe énergie, consommation
 *  - Fichiers Fonciers (DGFIP) → usage, nb logements
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Informations enrichies du bâtiment, ou null si non trouvé
 */
export async function getBatimentByCoords(
  lat: number,
  lng: number
): Promise<BatimentInfo | null> {
  try {
    // Filtre spatial PostGIS — cherche les bâtiments dans un rayon de 50m
    const geomFilter = `st_dwithin(geom_groupe,st_setsrid(st_point(${lng},${lat}),4326)::geography,50)`;

    const url = new URL(`${BDNB_BASE_URL}/batiment_groupe`);
    url.searchParams.set('select', [
      'batiment_groupe_id',
      'annee_construction',
      'usage_niveau_1_txt',
      'nb_logements',
      's_geom_groupe',
      'hauteur_mean',
      'materiaux_structure_mur_txt',
      'conso_energie_primaire',
      'classe_conso_energie',
      'classe_estimation_ges',
    ].join(','));
    url.searchParams.set('geom_groupe', geomFilter);
    url.searchParams.set('limit', '1');
    url.searchParams.set('order', 'annee_construction.desc');

    const response = await fetch(url.toString(), {
      headers: DEFAULT_HEADERS,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`[BDNB] ⚠️ API retourne ${response.status} — ${await response.text().catch(() => '')}`);
      return null;
    }

    // L'API BDNB v0 retourne un tableau directement (pas { results: [...] })
    const data = await response.json();
    const rows: any[] = Array.isArray(data) ? data : (data.results ?? []);
    if (rows.length === 0) {
      console.warn('[BDNB] ℹ️ Aucun bâtiment trouvé dans un rayon de 50m');
      return null;
    }

    const b = rows[0];

    // Calcul de la tranche d'année de construction
    let anneeConstructionTranche: string | null = null;
    if (b.annee_construction) {
      const annee = Number(b.annee_construction);
      if (annee < 1945)      anneeConstructionTranche = "Avant 1945";
      else if (annee < 1970) anneeConstructionTranche = "1945–1970";
      else if (annee < 1990) anneeConstructionTranche = "1970–1990";
      else if (annee < 2005) anneeConstructionTranche = "1990–2005";
      else if (annee < 2012) anneeConstructionTranche = "2005–2012";
      else                   anneeConstructionTranche = "Après 2012";
    }

    return {
      id: b.batiment_groupe_id ?? '',
      anneeConstruction: b.annee_construction ? Number(b.annee_construction) : null,
      anneeConstructionTranche,
      typeBatiment: b.usage_niveau_1_txt ?? 'Inconnu',
      nbLogements: b.nb_logements ?? null,
      surfaceHabitable: b.s_geom_groupe ?? null,
      hauteurMoyenne: b.hauteur_mean ?? null,
      materiauxMur: b.materiaux_structure_mur_txt ?? null,
      dpeExistant: (b.classe_conso_energie || b.conso_energie_primaire) ? {
        classe: b.classe_conso_energie ?? null,
        conso: b.conso_energie_primaire ?? null,
        ges: b.classe_estimation_ges ?? null,
        date: null, // champ non disponible sur cet endpoint
      } : null,
      geometry: null, // géométrie non demandée pour économiser la bande passante
    };
  } catch (error) {
    console.warn('[BDNB] ⚠️ Erreur lors de la requête :', error);
    return null;
  }
}

/**
 * Détermine la meilleure année de construction en croisant BDNB et ADEME.
 * La BDNB est généralement plus fiable car elle croise plusieurs sources.
 *
 * @param bdnbAnnee - Année depuis la BDNB (peut être null)
 * @param ademeAnnee - Année depuis l'ADEME/DPE (string, peut être "Non recensée")
 * @returns L'année la plus fiable disponible
 */
export function meilleurAnneeConstruction(
  bdnbAnnee: number | null,
  ademeAnnee: string
): string {
  // Priorité à la BDNB (données croisées = plus fiables)
  if (bdnbAnnee && bdnbAnnee > 1700 && bdnbAnnee <= new Date().getFullYear()) {
    return bdnbAnnee.toString();
  }

  // Fallback sur l'ADEME
  if (ademeAnnee && ademeAnnee !== "Non recensée") {
    return ademeAnnee;
  }

  return "Non recensée";
}
