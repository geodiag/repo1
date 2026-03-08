"use client";

/**
 * ParcelMap — Carte Leaflet + polygone parcelle cadastrale IGN.
 *
 * Stratégie de récupération de la géométrie (en parallèle) :
 *   1. Prop `parcelGeometry` fourni par le parent (données serveur)
 *   2. Fetch client-side APICarto IGN  (apicarto.ign.fr)
 *   3. Fetch client-side WFS IGN       (data.geopf.fr) — fallback CORS garanti
 */

import { useEffect, useRef, useState } from "react";

// ─── Types locaux ─────────────────────────────────────────────────────────────
type LMap      = { remove: () => void; fitBounds: (b: any, o?: any) => void; setView: (c: [number,number], z: number) => void; getZoom: () => number };
type LGeoLayer = { getBounds: () => { isValid: () => boolean }; remove: () => void };

interface ParcelMapProps {
  lat: number;
  lng: number;
  parcelGeometry?: object | null;
  parcelRef?: string;
  height?: number;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const CARTO_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR  = '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © CARTO';
const IGN_WMS_URL = "https://data.geopf.fr/wms-r/ows";

// ── Approche 1 : APICarto IGN ─────────────────────────────────────────────────
async function fetchViaApicarto(lat: number, lng: number): Promise<object | null> {
  const url = `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}&_limit=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const feat = json.features?.[0];
  if (!feat?.geometry) return null;
  return buildFeature(feat);
}

// ── Approche 2 : WFS Géoportail IGN (CORS garanti, data.geopf.fr) ────────────
async function fetchViaWfs(lat: number, lng: number): Promise<object | null> {
  const d = 0.0003; // ~30 m de marge
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const url  = `https://data.geopf.fr/wfs/ows?service=WFS&version=2.0.0`
    + `&request=GetFeature&typenames=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle`
    + `&outputFormat=application/json&count=5`
    + `&BBOX=${bbox},EPSG:4326`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  // Trouver la parcelle dont le polygone contient le point
  const features: any[] = json.features ?? [];
  // On prend la première (la plus proche du centroïde BBOX = notre point)
  const feat = features[0];
  if (!feat?.geometry) return null;
  return buildFeature(feat);
}

function buildFeature(feat: any): object {
  const p = feat.properties ?? {};
  return {
    type    : "Feature",
    geometry: feat.geometry,
    properties: {
      section : p.section  ?? p.SECTION  ?? "",
      numero  : p.numero   ?? p.NUMERO   ?? p.number ?? "",
      idu     : p.idu      ?? p.IDU      ?? "",
      surface : p.contenance ?? p.CONTENANCE ?? "",
    },
  };
}

/** Charge Leaflet (CDN) une seule fois. */
function injectLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("leaflet-css")) {
      const l = document.createElement("link");
      l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = LEAFLET_CSS;
      document.head.appendChild(l);
    }
    if ((window as any).L) return resolve();
    if (document.getElementById("leaflet-js")) {
      const t = setInterval(() => { if ((window as any).L) { clearInterval(t); resolve(); } }, 40);
      return;
    }
    const s = document.createElement("script");
    s.id = "leaflet-js"; s.src = LEAFLET_JS;
    s.onload = () => resolve(); s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

type FetchStatus = "idle" | "loading" | "found" | "notfound" | "error";

export default function ParcelMap({ lat, lng, parcelGeometry, parcelRef, height = 320 }: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LMap | null>(null);
  const geojsonRef   = useRef<LGeoLayer | null>(null);

  const [ready,       setReady]       = useState(false);
  const [wmsError,    setWmsError]    = useState(false);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [detectedRef, setDetectedRef] = useState("");

  // ─── Init carte + fetch géométrie ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFetchStatus("loading");
    setDetectedRef("");

    async function run() {
      // A. Lancer Leaflet + fetch en parallèle
      const [, geometry] = await Promise.all([
        injectLeaflet(),
        resolveGeometry(lat, lng, parcelGeometry ?? null),
      ]);

      if (cancelled) return;

      const L = (window as any).L;
      if (!L || !containerRef.current) {
        setFetchStatus("error");
        return;
      }

      // B. Nettoyer la carte précédente
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; geojsonRef.current = null; }
      (containerRef.current as any)._leaflet_id = undefined;

      // C. Créer la carte
      const map = L.map(containerRef.current, {
        scrollWheelZoom: false, zoomControl: true, attributionControl: true,
      }).setView([lat, lng], 18);

      L.tileLayer(CARTO_TILES, {
        maxZoom: 21, subdomains: ["a","b","c","d"],
        attribution: CARTO_ATTR, detectRetina: true,
      }).addTo(map);

      const wms = L.tileLayer.wms(IGN_WMS_URL, {
        layers: "CADASTRALPARCELS.PARCELLAIRE_EXPRESS",
        format: "image/png", transparent: true, version: "1.3.0",
        opacity: 0.85, attribution: "© IGN",
        errorTileUrl: "data:image/png;base64,iVBORw0KGgo=",
      });
      wms.on("tileerror", () => setWmsError(true));
      wms.addTo(map);

      L.circleMarker([lat, lng], {
        radius: 7, fillColor: "#e1000f", color: "#fff", weight: 2.5, fillOpacity: 1,
      }).addTo(map);

      mapRef.current = map;
      setReady(true);

      // D. Afficher la parcelle
      if (geometry) {
        applyGeojson(L, map, geometry);
        const props = (geometry as any)?.properties ?? {};
        const ref   = props.idu || (props.section && props.numero ? `${props.section} ${props.numero}` : "");
        if (ref) setDetectedRef(ref);
        setFetchStatus("found");
        console.log("✅ ParcelMap — géométrie appliquée :", props);
      } else {
        setFetchStatus("notfound");
        console.warn("⚠️ ParcelMap — aucune géométrie reçue pour", lat, lng);
      }
    }

    run().catch((e) => {
      if (!cancelled) { setFetchStatus("error"); console.error("ParcelMap error:", e); }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; geojsonRef.current = null; }
      setReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // ─── Mise à jour si parcelGeometry arrive en prop après l'init ───────────────
  useEffect(() => {
    const L   = (window as any).L;
    const map = mapRef.current;
    if (!L || !map || !parcelGeometry) return;
    applyGeojson(L, map, parcelGeometry);
    setFetchStatus("found");
  }, [parcelGeometry]);

  // ─── Helper : applique la couche GeoJSON sur la carte ───────────────────────
  function applyGeojson(L: any, map: LMap, geometry: object) {
    if (geojsonRef.current) {
      try { geojsonRef.current.remove(); } catch { /* ignore */ }
      geojsonRef.current = null;
    }
    try {
      const layer: LGeoLayer = L.geoJSON(geometry, {
        style: { color: "#22c55e", weight: 3, fillColor: "#22c55e", fillOpacity: 0.25 },
      }).addTo(map);
      geojsonRef.current = layer;
      const bounds = layer.getBounds();
      if (bounds?.isValid?.()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 19 });
    } catch (e) {
      console.error("ParcelMap — L.geoJSON() error:", e);
    }
  }

  const displayRef = (parcelRef && parcelRef !== "–") ? parcelRef : detectedRef;

  return (
    <div className="relative overflow-hidden bg-gray-100" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Badge référence cadastrale */}
      {displayRef && (
        <div
          className="absolute top-2 left-2 z-[1000] bg-white/96 border-l-4 border-l-green-500 border border-gray-200 px-3 py-2 shadow-md"
          style={{ backdropFilter: "blur(6px)" }}
        >
          <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-0.5">Parcelle cadastrale · IGN</p>
          <p className="text-sm font-black text-gray-900 font-mono tracking-wide">📍 {displayRef}</p>
        </div>
      )}

      {/* Légende */}
      {!wmsError && fetchStatus === "found" && (
        <div className="absolute bottom-6 right-2 z-[1000] bg-white/90 border border-gray-200 px-2 py-1 shadow-sm flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border-2 border-green-500 bg-green-500/20 shrink-0" />
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">Parcelle sélectionnée</span>
        </div>
      )}

      {/* Statut visible (debug) */}
      {ready && fetchStatus !== "found" && (
        <div className="absolute bottom-6 left-2 z-[1000] bg-white/90 border border-gray-200 px-2 py-1 shadow-sm">
          <span className="text-[9px] font-bold tracking-wide text-gray-500">
            {fetchStatus === "loading"  && "⏳ Chargement parcelle…"}
            {fetchStatus === "notfound" && "⚠️ Parcelle non identifiée"}
            {fetchStatus === "error"    && "❌ Erreur fetch parcelle"}
          </span>
        </div>
      )}

      {/* Spinner init */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-[999]">
          <div className="w-9 h-9 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Résout la géométrie en essayant 3 sources par ordre de priorité.
 * Retourne null si aucune ne fonctionne.
 */
async function resolveGeometry(lat: number, lng: number, propGeometry: object | null): Promise<object | null> {
  // 1. Prop fournie par le parent (données déjà présentes)
  if (propGeometry) {
    console.log("✅ ParcelMap — géométrie depuis props parent");
    return propGeometry;
  }

  // 2. APICarto IGN (plus précis, point exact)
  try {
    const g = await fetchViaApicarto(lat, lng);
    if (g) { console.log("✅ ParcelMap — géométrie via APICarto"); return g; }
  } catch (e) {
    console.warn("⚠️ ParcelMap — APICarto échoué:", e);
  }

  // 3. WFS Géoportail (fallback CORS garanti)
  try {
    const g = await fetchViaWfs(lat, lng);
    if (g) { console.log("✅ ParcelMap — géométrie via WFS Géoportail"); return g; }
  } catch (e) {
    console.warn("⚠️ ParcelMap — WFS échoué:", e);
  }

  return null;
}
