import { NextResponse } from 'next/server';

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

    const urlRisques    = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lng},${lat}&rayon=100`;
    const urlRadon      = `https://georisques.gouv.fr/api/v1/radon?code_insee=${insee}`;
    const urlCatnat     = `https://georisques.gouv.fr/api/v1/catnat?code_insee=${insee}&page=1&page_size=1`;
    const urlSismicite  = `https://georisques.gouv.fr/api/v1/zonage_sismique?latlon=${lng},${lat}`;
    const urlDpe        = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines?size=1&q=${encodeURIComponent(label || '')}`;
    const urlCadastre   = `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}`;
    const urlGPU        = `https://apicarto.ign.fr/api/gpu/zone-urba?geom=${encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }))}`;
    const urlDVF        = `https://api.dvf.etalab.gouv.fr/geomap/mutations?lat=${lat}&lon=${lng}&dist=300`;
    const urlBruit      = `https://georisques.gouv.fr/api/v1/bruit_aerodromes?latlon=${lng},${lat}&rayon=30000`;

    console.log("📡 Interrogation des bases de l'État (v4 — ERP+ENSA)...");

    const [resRisques, resRadon, resCatnat, resSismicite, resDpe, resCadastre, resGPU, resDVF, resBruit] = await Promise.all([
      fetch(urlRisques,   { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlRadon,     { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlCatnat,    { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlSismicite, { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlDpe,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlCadastre,  { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlGPU,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlDVF,       { headers, cache: 'no-store' }).catch(() => null),
      fetch(urlBruit,     { headers, cache: 'no-store' }).catch(() => null),
    ]);

    const dataRisques   = resRisques?.ok   ? await resRisques.json().catch(()   => ({ data: [] }))     : { data: [] };
    const dataRadon     = resRadon?.ok     ? await resRadon.json().catch(()     => ({ data: [] }))     : { data: [] };
    const dataCatnat    = resCatnat?.ok    ? await resCatnat.json().catch(()    => ({ data: [], total: 0 })) : { data: [], total: 0 };
    const dataSismicite = resSismicite?.ok ? await resSismicite.json().catch(() => ({ data: [] }))     : { data: [] };
    const dataDpe       = resDpe?.ok       ? await resDpe.json().catch(()       => ({ results: [] }))  : { results: [] };
    const dataCadastre  = resCadastre?.ok  ? await resCadastre.json().catch(()  => ({ features: [] })) : { features: [] };
    const dataGPU       = resGPU?.ok       ? await resGPU.json().catch(()       => ({ features: [] })) : { features: [] };
    const dataDVF       = resDVF?.ok       ? await resDVF.json().catch(()       => ({ features: [] })) : { features: [] };
    const dataBruit     = resBruit?.ok     ? await resBruit.json().catch(()     => ({ data: [] }))     : { data: [] };

    // Debug (à retirer en prod)
    console.log("🔍 Bruit aérodromes raw:", JSON.stringify(dataBruit).substring(0, 300));
    console.log("🔍 Radon raw:", JSON.stringify(dataRadon).substring(0, 200));
    console.log("🔍 Catnat raw:", JSON.stringify(dataCatnat).substring(0, 200));
    console.log("🔍 Sismicité raw:", JSON.stringify(dataSismicite).substring(0, 200));
    console.log("🔍 Cadastre raw:", JSON.stringify(dataCadastre).substring(0, 300));

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
    // L'API retourne `total` (nombre total) ou on compte le tableau `data`
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

    // ── 5. ADEME / DPE ───────────────────────────────────────────────────────
    let anneeConstruction = "Non recensée";
    if (dataDpe.results?.length > 0 && dataDpe.results[0].annee_construction) {
      anneeConstruction = dataDpe.results[0].annee_construction.toString();
    }

    // ── 6. Cadastre IGN ───────────────────────────────────────────────────────
    // contenance = surface en m² (peut aussi être en ares selon source)
    // On filtre les valeurs aberrantes (> 5 000 m² = probablement pas une parcelle résidentielle)
    let parcelleSurface = "Non disponible";
    let parcelleRef    = "–";
    let parcelleSection = "–";
    let parcelleNumero  = "–";
    let parcelleCommune = "–";
    // Géométrie GeoJSON brute de la parcelle (polygone), renvoyée au front pour affichage sur la carte
    let parcelleGeoJSON: object | null = null;

    const parcelle = dataCadastre.features?.[0];
    if (parcelle) {
      const props = parcelle.properties || {};

      // ── Surface ────────────────────────────────────────────────────────────
      const raw = props.contenance ?? props.surface ?? null;
      if (raw) {
        const surfaceM2 = raw <= 500 ? raw * 100 : raw; // conversion ares → m²
        parcelleSurface = surfaceM2 <= 5000
          ? `${Math.round(surfaceM2).toLocaleString('fr-FR')} m²`
          : `${Math.round(surfaceM2).toLocaleString('fr-FR')} m² (terrain)`;
      }

      // ── Références cadastrales ─────────────────────────────────────────────
      const dept    = props.departmentcode || props.dep || "";
      const commune = props.municipalitycode || props.commune || "";
      const section = props.section || "";
      const numero  = props.numero || props.number || "";

      parcelleSection = section || "–";
      parcelleNumero  = numero  || "–";
      parcelleCommune = commune || "–";

      if (section && numero) {
        parcelleRef = `${dept}${commune} ${section}${numero}`.trim();
      }

      // ── Géométrie polygonale (GeoJSON Feature complet) ────────────────────
      // On renvoie le Feature entier : L.geoJSON() de Leaflet l'accepte directement
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
    interface DvfTransaction {
      date: string; prix: number; surface: number | null; type: string; prixM2: number | null;
    }
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
    interface BruitAerodrome {
      nom: string;
      codePEB: string;
    }
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

    return NextResponse.json({
      success: true,
      risques: {
        inondation, technologique,
        sismicite, potentielRadon, nbCatnat,
        anneeConstruction,
        parcelleSurface, parcelleRef, parcelleSection, parcelleNumero, parcelleCommune, parcelleGeoJSON,
        zonePLU, codeZonePLU, libelleZone,
        transactionsRecentes, prixMoyen,
        ensaConcerne, ensaAerodromes,
      }
    });

  } catch (error) {
    console.error('🔥 Erreur globale:', error);
    return NextResponse.json({ error: 'Service critique indisponible.' }, { status: 500 });
  }
}
