import { NextResponse } from 'next/server';
import type { DvfTransaction, BruitAerodrome, SisDetail, IcpeProximite, MvtDetail, BatimentInfo } from '@/lib/types';
import { getBatimentByCoords, meilleurAnneeConstruction } from '@/lib/bdnb';

// ⚠️ IMPORTANT : Forcer le mode dynamique pour que Next.js ne mette JAMAIS en cache
// cette route. Sans ça, toutes les adresses recevraient les données de la première requête.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const insee = searchParams.get('insee');
  const label = searchParams.get('label');

  if (!lat || !lng || !insee) {
    return NextResponse.json({ error: 'Coordonnées et code INSEE obligatoires.' }, { status: 400 });
  }

  try {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'Geodiag-SaaS/1.0'
    };

    // ── URLs des 9 endpoints existants ───────────────────────────────────────
    const urlRisques    = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lng},${lat}&rayon=100`;
    const urlRadon      = `https://georisques.gouv.fr/api/v1/radon?code_insee=${insee}`;
    const urlCatnat     = `https://georisques.gouv.fr/api/v1/catnat?code_insee=${insee}&page=1&page_size=1`;
    const urlSismicite  = `https://georisques.gouv.fr/api/v1/zonage_sismique?latlon=${lng},${lat}`;
    // ── Requête ADEME : on cible le code_insee + nom de rue (sans ville/CP pour éviter le bruit)
    // L'API data-fair accepte `qs` en syntaxe Elasticsearch et `q` pour le texte libre.
    // On extrait uniquement le début du label (avant la virgule ou le code postal) pour ne garder
    // que le numéro + nom de rue, et on filtre par code INSEE commune.
    const streetOnly = (label || '').replace(/\s+\d{5}\s+\w.*$/, '').trim(); // "13 Rue Etienne Dusart"
    const urlDpe = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines`
      + `?size=3`
      + `&qs=${encodeURIComponent(`code_commune_insee_ban:"${insee}"`)}`
      + `&q=${encodeURIComponent(streetOnly)}`
      + `&q_fields=adresse_ban`
      + `&sort=-_score`;
    // _limit=1 : parcelle la plus proche seulement (évite les faux positifs adjacents)
    // code_insee : filtre sur la commune, évite les débordements aux limites communales
    const urlCadastre   = `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}&code_insee=${insee}&_limit=1`;
    const urlGPU        = `https://apicarto.ign.fr/api/gpu/zone-urba?geom=${encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }))}`;
    const urlDVF        = `https://api.dvf.etalab.gouv.fr/geomap/mutations?lat=${lat}&lon=${lng}&dist=300`;
    const urlBruit      = `https://georisques.gouv.fr/api/v1/bruit_aerodromes?latlon=${lng},${lat}&rayon=30000`;

    // ── URLs des 4 NOUVEAUX endpoints (SIS, ICPE, MVT, Cavités) ─────────────
    const urlSIS        = `https://georisques.gouv.fr/api/v1/sis?latlon=${lng},${lat}&rayon=500`;
    const urlICPE       = `https://georisques.gouv.fr/api/v1/installations_classees?latlon=${lng},${lat}&rayon=500&page=1&page_size=10`;
    const urlMVT        = `https://georisques.gouv.fr/api/v1/mvt?latlon=${lng},${lat}&rayon=500`;
    const urlCavites    = `https://georisques.gouv.fr/api/v1/cavites?latlon=${lng},${lat}&rayon=500`;

    console.log("📡 Interrogation des bases de l'État (v6 — ERP+ENSA+SIS+ICPE+MVT+Cavités+BDNB)...");

    // ── Appels parallèles : 14 API en même temps ─────────────────────────────
    // Chaque fetch a son .catch individuel pour la Graceful Degradation
    // La BDNB est appelée en parallèle via getBatimentByCoords (graceful degradation intégrée)
    const [
      resRisques, resRadon, resCatnat, resSismicite, resDpe,
      resCadastre, resGPU, resDVF, resBruit,
      resSIS, resICPE, resMVT, resCavites,
      batimentBDNB,
    ] = await Promise.all([
      fetch(urlRisques,   { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlRadon,     { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlCatnat,    { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlSismicite, { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlDpe,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlCadastre,  { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlGPU,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlDVF,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlBruit,     { headers, cache: 'no-store' }).catch(() => null),
      // Nouveaux endpoints Géorisques
      fetch(urlSIS,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlICPE,      { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlMVT,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlCavites,   { headers, cache: 'no-store' }).catch(() => null),
      // BDNB — Base de Données Nationale des Bâtiments
      getBatimentByCoords(parseFloat(lat), parseFloat(lng)),
    ]);

    // ── Parsing JSON avec fallback ───────────────────────────────────────────
    const dataRisques   = resRisques?.ok   ? await resRisques.json().catch(()   => ({ data: [] }))     : { data: [] };
    const dataRadon     = resRadon?.ok     ? await resRadon.json().catch(()     => ({ data: [] }))     : { data: [] };
    const dataCatnat    = resCatnat?.ok    ? await resCatnat.json().catch(()    => ({ data: [], total: 0 })) : { data: [], total: 0 };
    const dataSismicite = resSismicite?.ok ? await resSismicite.json().catch(() => ({ data: [] }))     : { data: [] };
    const dataDpe       = resDpe?.ok       ? await resDpe.json().catch(()       => ({ results: [] }))  : { results: [] };
    const dataCadastre  = resCadastre?.ok  ? await resCadastre.json().catch(()  => ({ features: [] })) : { features: [] };
    const dataGPU       = resGPU?.ok       ? await resGPU.json().catch(()       => ({ features: [] })) : { features: [] };
    const dataDVF       = resDVF?.ok       ? await resDVF.json().catch(()       => ({ features: [] })) : { features: [] };
    const dataBruit     = resBruit?.ok     ? await resBruit.json().catch(()     => ({ data: [] }))     : { data: [] };
    // Nouveaux
    const dataSIS       = resSIS?.ok       ? await resSIS.json().catch(()       => ({ data: [] }))     : { data: [] };
    const dataICPE      = resICPE?.ok      ? await resICPE.json().catch(()      => ({ data: [] }))     : { data: [] };
    const dataMVT       = resMVT?.ok       ? await resMVT.json().catch(()       => ({ data: [] }))     : { data: [] };
    const dataCavites   = resCavites?.ok   ? await resCavites.json().catch(()   => ({ data: [] }))     : { data: [] };

    // Debug (à retirer en prod)
    console.log("🔍 Bruit aérodromes raw:", JSON.stringify(dataBruit).substring(0, 300));
    console.log("🔍 Radon raw:", JSON.stringify(dataRadon).substring(0, 200));
    console.log("🔍 Catnat raw:", JSON.stringify(dataCatnat).substring(0, 200));
    console.log("🔍 Sismicité raw:", JSON.stringify(dataSismicite).substring(0, 200));
    console.log("🔍 Cadastre raw:", JSON.stringify(dataCadastre).substring(0, 300));
    console.log("🔍 SIS raw:", JSON.stringify(dataSIS).substring(0, 300));
    console.log("🔍 ICPE raw:", JSON.stringify(dataICPE).substring(0, 300));
    console.log("🔍 MVT raw:", JSON.stringify(dataMVT).substring(0, 300));
    console.log("🔍 Cavités raw:", JSON.stringify(dataCavites).substring(0, 300));

    // ── 1. Risques naturels & technologiques ──────────────────────────────────
    const rawRisques    = dataRisques.data || [];
    const inondation    = rawRisques.some((r: any) =>
      r.libelle_risque_long?.toLowerCase().includes('inondation') ||
      r.code_risque?.toLowerCase().startsWith('i')
    );
    const technologique = rawRisques.some((r: any) =>
      r.libelle_risque_long?.toLowerCase().includes('technologique') ||
      r.libelle_risque_long?.toLowerCase().includes('industriel') ||
      r.code_risque?.toLowerCase().startsWith('t')
    );

    // ── 2. Radon — champ réel : potentiel_radon (1, 2 ou 3) ──────────────────
    let potentielRadon = "Non classé";
    if (dataRadon.data?.length > 0) {
      const row = dataRadon.data[0];
      // L'API retourne potentiel_radon (entier) ou classe_potentiel selon la version
      const niveau = row.potentiel_radon ?? row.classe_potentiel ?? null;
      const labels: Record<number, string> = {
        1: "Catégorie 1 — Faible",
        2: "Catégorie 2 — Moyen",
        3: "Catégorie 3 — Significatif",
      };
      if (niveau && labels[niveau]) {
        potentielRadon = labels[niveau];
      } else if (niveau) {
        potentielRadon = `Catégorie ${niveau}`;
      }
    }

    // ── 3. CATNAT — total des arrêtés sur la commune ──────────────────────────
    const nbCatnat = dataCatnat.total ?? dataCatnat.data?.length ?? 0;

    // ── 4. Sismicité — zone réelle depuis l'API ───────────────────────────────
    let sismicite = "Non déterminé";
    const zoneSismo = dataSismicite.data?.[0];
    if (zoneSismo) {
      const zone = zoneSismo.zone_sismique ?? zoneSismo.code_zone ?? zoneSismo.niveau ?? null;
      const libelles: Record<string, string> = {
        "1": "Zone 1 — Très faible",
        "2": "Zone 2 — Faible",
        "3": "Zone 3 — Modérée",
        "4": "Zone 4 — Moyenne",
        "5": "Zone 5 — Forte",
      };
      if (zone && libelles[String(zone)]) {
        sismicite = libelles[String(zone)];
      } else if (zone) {
        sismicite = `Zone ${zone}`;
      }
    }

    // ── 5. ADEME / DPE + croisement BDNB ────────────────────────────────────
    // On récupère d'abord l'année ADEME (jusqu'à 3 résultats, on prend le premier avec une année valide),
    // puis on croise avec la BDNB.
    // Champs possibles selon la version du dataset : annee_construction ou annee_construction_dpe
    let anneeAdeme = "Non recensée";
    const dpeRows: any[] = dataDpe.results || dataDpe.data || [];
    console.log(`🏠 ADEME DPE: ${dpeRows.length} résultat(s) pour "${streetOnly}" (INSEE ${insee})`);
    for (const row of dpeRows) {
      const annee = row.annee_construction ?? row.annee_construction_dpe ?? null;
      if (annee && Number(annee) > 1700 && Number(annee) <= new Date().getFullYear()) {
        anneeAdeme = String(annee);
        break;
      }
    }
    const anneeConstruction = meilleurAnneeConstruction(
      batimentBDNB?.anneeConstruction ?? null,
      anneeAdeme
    );

    console.log("🏠 BDNB:", batimentBDNB ? `trouvé (${batimentBDNB.typeBatiment}, ${batimentBDNB.anneeConstruction})` : "non trouvé");

    // ── 6. Cadastre IGN ───────────────────────────────────────────────────────
    let parcelleSurface = "Non disponible";
    let parcelleRef    = "–";
    let parcelleSection = "–";
    let parcelleNumero  = "–";
    let parcelleCommune = "–";
    let parcelleGeoJSON: object | null = null;

    // Log complet pour diagnostiquer ce que l'API IGN retourne réellement
    console.log(`🗺️ Cadastre raw: total=${dataCadastre.numberReturned ?? dataCadastre.features?.length ?? 0} features`);
    const parcelle = dataCadastre.features?.[0];
    if (parcelle) {
      const props = parcelle.properties || {};
      // Log toutes les clés reçues pour détecter d'éventuels changements de l'API IGN
      console.log(`🗺️ Cadastre props keys: ${Object.keys(props).join(', ')}`);
      console.log(`🗺️ Cadastre props values: ${JSON.stringify(props)}`);

      // ── Surface ────────────────────────────────────────────────────────────
      // APICarto IGN : contenance est en CENTIARES (= m², pas en ares)
      // 1 centiare = 1 m² → aucune conversion nécessaire
      const rawContenance = props.contenance ?? props.surface ?? null;
      if (rawContenance) {
        const surfaceM2 = Number(rawContenance);
        parcelleSurface = surfaceM2 <= 5000
          ? `${Math.round(surfaceM2).toLocaleString('fr-FR')} m²`
          : `${Math.round(surfaceM2).toLocaleString('fr-FR')} m² (terrain)`;
      }

      // ── Références cadastrales ─────────────────────────────────────────────
      // Champs réels APICarto IGN : code_dep, code_com, com_abs, section, numero, idu
      // L'IDU (Identifiant Unique) est pré-calculé par IGN : code_dep + code_com + com_abs + section + numero
      // ex : "39200000BA0187"
      const codeDep  = props.code_dep           || props.departmentcode  || props.dep      || "";
      const codeCom  = props.code_com           || props.municipalitycode || props.commune  || "";
      const comAbs   = props.com_abs            || "000";
      const section  = props.section            || "";
      const numero   = props.numero             || props.number           || "";
      const idu      = props.idu                || "";   // référence complète IGN

      parcelleSection = section || "–";
      parcelleNumero  = numero  || "–";
      parcelleCommune = codeCom ? `${codeDep}${codeCom}` : "–";

      // Priorité à l'IDU fourni directement par IGN, sinon reconstitution manuelle
      if (idu) {
        parcelleRef = idu;
      } else if (section && numero) {
        parcelleRef = `${codeDep}${codeCom}${comAbs}${section}${numero}`.trim();
      }

      console.log(`🏛️ Cadastre: section=${section}, numero=${numero}, idu=${idu}, ref=${parcelleRef}`);

      // ── Géométrie polygonale (GeoJSON Feature complet) ────────────────────
      if (parcelle.geometry) {
        parcelleGeoJSON = {
          type: "Feature",
          geometry: parcelle.geometry,
          properties: { ref: parcelleRef },
        };
      }
    }

    // ── 7. GPU / PLU ─────────────────────────────────────────────────────────
    let zonePLU     = "Non déterminée";
    let codeZonePLU = "";
    let libelleZone = "";
    const zoneUrba = dataGPU.features?.[0];
    if (zoneUrba) {
      const props = zoneUrba.properties || {};
      codeZonePLU = props.typezone || props.libelle || "";
      libelleZone = props.libelong || props.destdomi || "";
      if (codeZonePLU) zonePLU = codeZonePLU;
    }

    // ── 8. DVF – transactions récentes ───────────────────────────────────────
    let transactionsRecentes: DvfTransaction[] = [];
    let prixMoyen = "Non disponible";

    const mutations = dataDVF.features || [];
    if (mutations.length > 0) {
      const relevant = mutations
        .filter((m: any) => m.properties?.valeur_fonciere && m.properties?.date_mutation)
        .sort((a: any, b: any) =>
          new Date(b.properties.date_mutation).getTime() - new Date(a.properties.date_mutation).getTime()
        )
        .slice(0, 5);

      transactionsRecentes = relevant.map((m: any) => {
        const p = m.properties;
        const surface = p.surface_reelle_bati || p.surface_terrain || null;
        return {
          date: p.date_mutation?.substring(0, 7) ?? "–",
          prix: Math.round(p.valeur_fonciere),
          surface,
          type: p.type_local || "Bien",
          prixM2: surface ? Math.round(p.valeur_fonciere / surface) : null,
        };
      });

      const avecSurface = transactionsRecentes.filter(t => t.prixM2 !== null);
      if (avecSurface.length > 0) {
        const moy = avecSurface.reduce((acc, t) => acc + (t.prixM2 ?? 0), 0) / avecSurface.length;
        prixMoyen = `${Math.round(moy).toLocaleString('fr-FR')} €/m²`;
      }
    }

    // ── 9. ENSA – Plan d'Exposition au Bruit (PEB) ────────────────────────────
    let ensaConcerne = false;
    let ensaAerodromes: BruitAerodrome[] = [];

    const bruitData = dataBruit.data || dataBruit.features || dataBruit || [];
    const bruitList = Array.isArray(bruitData) ? bruitData : [];

    if (bruitList.length > 0) {
      ensaConcerne = true;
      ensaAerodromes = bruitList.slice(0, 3).map((item: any) => {
        const props = item.properties || item;
        return {
          nom: props.nom_aeroport ?? props.libelle_aeroport ?? props.nom ?? "Aérodrome",
          codePEB: props.zone_peb ?? props.code_zone ?? props.niveau_bruit ?? "–",
        };
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NOUVEAUX : SIS, ICPE, Mouvements de terrain, Cavités
    // ═══════════════════════════════════════════════════════════════════════════

    // ── 10. SIS — Secteurs d'Information sur les Sols ─────────────────────────
    // Identifie les terrains où une pollution des sols est connue ou suspectée
    // (anciens sites industriels, décharges, etc.)
    let sisConcerne = false;
    let sisDetails: SisDetail[] = [];

    const sisData = dataSIS.data || [];
    if (sisData.length > 0) {
      sisConcerne = true;
      sisDetails = sisData.slice(0, 5).map((item: any) => ({
        nom: item.nom ?? item.libelle ?? item.nom_sis ?? "Secteur non nommé",
        description: item.description ?? item.commentaire ?? item.activite ?? "Aucune description disponible",
      }));
    }

    // ── 11. ICPE — Installations Classées pour la Protection de l'Environnement ─
    // Sites industriels soumis à autorisation/enregistrement/déclaration à proximité
    let icpeConcerne = false;
    let icpeProximite: IcpeProximite[] = [];

    const icpeData = dataICPE.data || [];
    if (icpeData.length > 0) {
      icpeConcerne = true;
      icpeProximite = icpeData.slice(0, 10).map((item: any) => ({
        nom: item.nom_ets ?? item.raison_sociale ?? item.nom ?? "Installation non nommée",
        regime: item.regime ?? item.libelle_regime ?? item.seveso ?? "Non précisé",
        distance: item.distance ?? 0,
      }));
    }

    // ── 12. MVT — Mouvements de terrain ──────────────────────────────────────
    // Glissements, effondrements, coulées, éboulements, érosion
    let mvtConcerne = false;
    let mvtDetails: MvtDetail[] = [];

    const mvtData = dataMVT.data || [];
    if (mvtData.length > 0) {
      mvtConcerne = true;
      mvtDetails = mvtData.slice(0, 5).map((item: any) => ({
        type: item.type_mvt ?? item.libelle ?? item.nature ?? "Type non précisé",
        date: item.date_debut ?? item.date ?? item.annee ?? "Date inconnue",
      }));
    }

    // ── 13. Cavités souterraines ─────────────────────────────────────────────
    // Cavités naturelles ou artificielles (carrières, mines, marnières)
    let cavitesConcerne = false;
    let cavitesProximite = 0;

    const cavitesData = dataCavites.data || [];
    if (cavitesData.length > 0) {
      cavitesConcerne = true;
      cavitesProximite = cavitesData.length;
    }

    // ═══════════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      risques: {
        // Existants
        inondation, technologique,
        sismicite, potentielRadon, nbCatnat,
        anneeConstruction,
        parcelleSurface, parcelleRef, parcelleSection, parcelleNumero, parcelleCommune, parcelleGeoJSON,
        zonePLU, codeZonePLU, libelleZone,
        transactionsRecentes, prixMoyen,
        ensaConcerne, ensaAerodromes,
        // Nouveaux — Géorisques
        sisConcerne, sisDetails,
        icpeConcerne, icpeProximite,
        mvtConcerne, mvtDetails,
        cavitesConcerne, cavitesProximite,
        // BDNB — Bâtiment enrichi
        batiment: batimentBDNB,
      }
    });

  } catch (error) {
    console.error('🔥 Erreur globale:', error);
    return NextResponse.json({ error: 'Service critique indisponible.' }, { status: 500 });
  }
}
