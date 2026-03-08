"use client";

/**
 * ParcelMap — Carte Leaflet (CDN) avec polygone de parcelle cadastrale.
 *
 * Architecture React stricte (pas de boucle Leaflet) :
 *
 *   Effet 1  []                  → init carte UNE seule fois (OSM, pas de WMS)
 *   Effet nav [lat, lng, ready]  → setView quand l'adresse change
 *   Effet geo [lat, lng]         → fetch géométrie côté client (triple fallback)
 *   Effet 2   [geo, localGeo]    → nettoie l'ancienne couche GeoJSON, ajoute la nouvelle
 *                                   invalidateSize() + fitBounds()
 *
 * Import dans le parent (Next.js App Router) :
 *   const ParcelMap = dynamic(() => import("@/components/ParcelMap"), { ssr: false });
 */

import { useEffect, useRef, useState } from "react";

// ─── Leaflet CDN ──────────────────────────────────────────────────────────────
const L_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const L_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// ─── Fond de carte OpenStreetMap (utilisé pendant les tests pour éviter les 429 IGN WMS) ──
const OSM_URL  = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// ─── WMS IGN (commenté volontairement — source des erreurs 429) ───────────────
// const IGN_WMS_URL = "https://data.geopf.fr/wms-r/ows";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ParcelMapProps {
  lat: number;
  lng: number;
  /** GeoJSON Feature ou FeatureCollection de la parcelle (prop optionnelle du parent) */
  parcelGeometry?: object | null;
  parcelRef?: string;
  height?: number;
}

// ─── Chargement Leaflet (CDN, une seule fois par page) ────────────────────────
function injectLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("_lf-css")) {
      const lnk = document.createElement("link");
      lnk.id = "_lf-css"; lnk.rel = "stylesheet"; lnk.href = L_CSS;
      document.head.appendChild(lnk);
    }
    if ((window as any).L) return resolve();
    if (document.getElementById("_lf-js")) {
      const t = setInterval(() => { if ((window as any).L) { clearInterval(t); resolve(); } }, 40);
      return;
    }
    const sc = document.createElement("script");
    sc.id = "_lf-js"; sc.src = L_JS;
    sc.onload  = () => resolve();
    sc.onerror = () => resolve();      // dégradation silencieuse
    document.head.appendChild(sc);
  });
}

// ─── Fetch géométrie : triple fallback (sans provoquer de re-render carte) ────

/** Source 1 : APICarto IGN (point exact) */
async function fetchApicarto(lat: number, lng: number): Promise<object | null> {
  const url = `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}&_limit=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const feat = json.features?.[0];
  return feat?.geometry ? wrapFeature(feat) : null;
}

/** Source 2 : WFS Géoportail data.geopf.fr (CORS garanti) */
async function fetchWfs(lat: number, lng: number): Promise<object | null> {
  const d   = 0.0003; // ~30 m autour du point
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const url  = `https://data.geopf.fr/wfs/ows`
    + `?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature`
    + `&TYPENAMES=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle`
    + `&OUTPUTFORMAT=application/json&count=1`
    + `&BBOX=${bbox},EPSG:4326`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  const feat = json.features?.[0];
  return feat?.geometry ? wrapFeature(feat) : null;
}

function wrapFeature(feat: any): object {
  const p = feat.properties ?? {};
  return {
    type    : "Feature",
    geometry: feat.geometry,
    properties: {
      section : p.section  ?? "",
      numero  : p.numero   ?? "",
      idu     : p.idu      ?? "",
      surface : p.contenance ?? "",
    },
  };
}

async function resolveGeometry(
  lat: number,
  lng: number,
  propGeom: object | null,
): Promise<object | null> {
  // Source 0 : prop fournie par le parent (données déjà disponibles)
  if (propGeom) {
    console.log("[ParcelMap] géométrie ← props parent");
    return propGeom;
  }
  // Source 1 : APICarto
  try {
    const g = await fetchApicarto(lat, lng);
    if (g) { console.log("[ParcelMap] géométrie ← APICarto IGN"); return g; }
  } catch (e) {
    console.warn("[ParcelMap] APICarto KO:", e);
  }
  // Source 2 : WFS Géoportail
  try {
    const g = await fetchWfs(lat, lng);
    if (g) { console.log("[ParcelMap] géométrie ← WFS Géoportail"); return g; }
  } catch (e) {
    console.warn("[ParcelMap] WFS KO:", e);
  }
  console.warn("[ParcelMap] aucune géométrie trouvée pour", lat, lng);
  return null;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function ParcelMap({
  lat, lng, parcelGeometry, parcelRef, height = 320,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);         // instance Leaflet
  const geoJsonRef   = useRef<any>(null);         // couche GeoJSON active

  const [ready,         setReady]         = useState(false);
  const [localGeometry, setLocalGeometry] = useState<object | null>(null);
  const [detectedRef,   setDetectedRef]   = useState("");

  // ════════════════════════════════════════════════════════════════════════════
  // EFFET 1 — Initialisation carte (dépendances VIDES — s'exécute une seule fois)
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let destroyed = false;

    async function boot() {
      await injectLeaflet();
      if (destroyed || !containerRef.current) return;

      const L = (window as any).L;
      if (!L) return;

      // Nettoyage (HMR / React Strict Mode)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      (containerRef.current as any)._leaflet_id = undefined;

      const map = L.map(containerRef.current, {
        scrollWheelZoom : false,
        zoomControl     : true,
        attributionControl: true,
      }).setView([lat ?? 46.603, lng ?? 1.888], lat ? 17 : 6);

      // ── Fond OpenStreetMap (WMS IGN commenté pour éviter les 429) ──────────
      L.tileLayer(OSM_URL, {
        maxZoom    : 19,
        attribution: OSM_ATTR,
        detectRetina: true,
      }).addTo(map);

      // ── WMS IGN cadastral (DÉSACTIVÉ — source des 429 Too Many Requests) ──
      // Réactiver une fois le throttling réglé côté IGN ou côté requêtes.
      //
      // L.tileLayer.wms(IGN_WMS_URL, {
      //   layers     : "CADASTRALPARCELS.PARCELLAIRE_EXPRESS",
      //   format     : "image/png",
      //   transparent: true,
      //   version    : "1.3.0",
      //   opacity    : 0.75,
      //   attribution: "© IGN",
      // }).addTo(map);

      mapRef.current = map;
      setReady(true);
    }

    boot();

    return () => {
      destroyed = true;
      // Nettoyage Leaflet obligatoire — évite les fuites mémoire
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []); // ← VIDE — ne jamais recréer la carte sauf démontage/remontage

  // ════════════════════════════════════════════════════════════════════════════
  // EFFET NAVIGATION — Centrer la carte quand l'adresse change
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!ready || !mapRef.current || !lat || !lng) return;
    mapRef.current.setView([lat, lng], 17);
  }, [lat, lng, ready]);

  // ════════════════════════════════════════════════════════════════════════════
  // EFFET FETCH — Récupérer la géométrie côté client quand lat/lng change
  // Ne modifie que `localGeometry` (state) — ne touche pas à la carte
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!lat || !lng) return;

    let cancelled = false;
    setLocalGeometry(null);   // reset pour la nouvelle adresse
    setDetectedRef("");

    resolveGeometry(lat, lng, parcelGeometry ?? null).then((g) => {
      if (cancelled) return;
      setLocalGeometry(g);
      if (g) {
        const p   = (g as any)?.properties ?? {};
        const ref = p.idu || (p.section && p.numero ? `${p.section} ${p.numero}` : "");
        if (ref) setDetectedRef(ref);
      }
    });

    return () => { cancelled = true; };
  }, [lat, lng]); // `parcelGeometry` exclu volontairement — géré par Effet 2

  // ════════════════════════════════════════════════════════════════════════════
  // EFFET 2 — Mise à jour du polygone GeoJSON (dépendances : géométrie uniquement)
  // Déclenché quand la géométrie change (prop parent OU fetch local)
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const L       = (window as any).L;
    const map     = mapRef.current;
    // La source prioritaire est la prop parent, sinon le fetch local
    const geometry = parcelGeometry ?? localGeometry;

    if (!L || !map) return;

    // ── Nettoyer l'ancienne couche GeoJSON ────────────────────────────────────
    if (geoJsonRef.current) {
      try { geoJsonRef.current.remove(); } catch { /* ignoré */ }
      geoJsonRef.current = null;
    }

    if (!geometry) return; // rien à afficher

    // ── Ajouter la nouvelle couche ────────────────────────────────────────────
    let layer: any;
    try {
      layer = L.geoJSON(geometry, {
        style: {
          color      : "#22c55e",   // vert vif
          weight     : 3,
          fillColor  : "#22c55e",
          fillOpacity: 0.20,
        },
      }).addTo(map);
      geoJsonRef.current = layer;
    } catch (e) {
      console.error("[ParcelMap] L.geoJSON() erreur:", e);
      return;
    }

    // ── Fix dimensionnement + centrage ────────────────────────────────────────
    // invalidateSize() AVANT fitBounds : force Leaflet à recalculer la taille
    // de son conteneur (indispensable si le parent était caché au montage).
    map.invalidateSize();

    const bounds = layer.getBounds();
    if (bounds?.isValid?.()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 19 });
    }
  }, [parcelGeometry, localGeometry]); // ← Effet 2

  const displayRef = (parcelRef && parcelRef !== "–") ? parcelRef : detectedRef;

  return (
    <div className="relative overflow-hidden bg-gray-100" style={{ height }}>

      {/* Conteneur Leaflet */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Badge référence cadastrale */}
      {displayRef && (
        <div
          className="absolute top-2 left-2 z-[1000] bg-white/95 border-l-4 border-l-green-500 border border-gray-200 px-3 py-2 shadow-md"
          style={{ backdropFilter: "blur(6px)" }}
        >
          <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-0.5">
            Parcelle cadastrale · IGN
          </p>
          <p className="text-sm font-black text-gray-900 font-mono tracking-wide">
            📍 {displayRef}
          </p>
        </div>
      )}

      {/* Légende parcelle (bas droit) */}
      {localGeometry || parcelGeometry ? (
        <div className="absolute bottom-6 right-2 z-[1000] bg-white/90 border border-gray-200 px-2 py-1 shadow-sm flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border-2 border-green-500 bg-green-500/20 shrink-0" />
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">
            Parcelle sélectionnée
          </span>
        </div>
      ) : null}

      {/* Spinner d'initialisation */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-[999]">
          <div className="w-9 h-9 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
