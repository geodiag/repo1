"use client";

/**
 * ParcelMap — Carte Leaflet avec autodetection de la parcelle cadastrale IGN.
 *
 * Stratégie d'affichage du polygone :
 *   1. Si `parcelGeometry` est fourni en prop → on l'affiche directement.
 *   2. Sinon, on fait un appel direct (côté navigateur) à l'API APICarto IGN
 *      pour récupérer la géométrie de la parcelle à [lat, lng].
 *      → Fiable car APICarto IGN supporte le CORS et ne nécessite pas de clé.
 *
 * Fond de carte : CartoDB Light + WMS IGN parcellaire cadastral.
 */

import { useEffect, useRef, useState } from "react";

// ─── Types locaux ─────────────────────────────────────────────────────────────
type LMap   = {
  remove: () => void;
  fitBounds: (b: any, opts?: any) => void;
  getZoom: () => number;
  setView: (center: [number, number], zoom: number) => void;
};
type LGeoLayer = { getBounds: () => { isValid: () => boolean }; remove: () => void };

interface ParcelMapProps {
  lat: number;
  lng: number;
  parcelGeometry?: object | null;   // prop optionnelle (fallback / pré-chargé)
  parcelRef?: string;
  height?: number;
}

// ─── Assets Leaflet (CDN) ────────────────────────────────────────────────────
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// ─── Fonds de carte ──────────────────────────────────────────────────────────
const CARTO_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR  = '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>';
const IGN_WMS_URL = "https://data.geopf.fr/wms-r/ows";

// ─── APICarto IGN — parcelle cadastrale (CORS ouvert, sans clé) ─────────────
const IGN_CADASTRE = (lat: number, lng: number) =>
  `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}&_limit=1`;

/** Charge Leaflet CSS + JS via CDN une seule fois. */
function injectLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id    = "leaflet-css";
      link.rel   = "stylesheet";
      link.href  = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if ((window as any).L) return resolve();
    if (document.getElementById("leaflet-js")) {
      const t = setInterval(() => { if ((window as any).L) { clearInterval(t); resolve(); } }, 40);
      return;
    }
    const s  = document.createElement("script");
    s.id     = "leaflet-js";
    s.src    = LEAFLET_JS;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

/** Récupère la géométrie de la parcelle via APICarto IGN (côté navigateur). */
async function fetchParcelGeometry(lat: number, lng: number): Promise<object | null> {
  try {
    const res = await fetch(IGN_CADASTRE(lat, lng), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.geometry) return null;
    return {
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        section: feature.properties?.section ?? "",
        numero:  feature.properties?.numero  ?? "",
        idu:     feature.properties?.idu     ?? "",
      },
    };
  } catch {
    return null;
  }
}

export default function ParcelMap({
  lat, lng, parcelGeometry, parcelRef, height = 320,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LMap | null>(null);
  const geojsonRef   = useRef<LGeoLayer | null>(null);
  const [ready, setReady]       = useState(false);
  const [wmsError, setWmsError] = useState(false);
  const [localRef, setLocalRef] = useState<string>("");   // ref détectée côté client

  // ──────────────────────────────────────────────────────────────────────────
  // Effet principal : init carte + fetch géométrie côté navigateur
  // Déclenché à chaque changement de lat/lng (nouvelle adresse saisie)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false;

    async function init() {
      // 1. Charger Leaflet et initialiser la carte en parallèle du fetch IGN
      const [, geometry] = await Promise.all([
        injectLeaflet(),
        // Si parcelGeometry est fourni en prop, on l'utilise directement,
        // sinon on fetch directement depuis le navigateur (plus fiable)
        parcelGeometry
          ? Promise.resolve(parcelGeometry)
          : fetchParcelGeometry(lat, lng),
      ]);

      if (destroyed || !containerRef.current) return;

      const L = (window as any).L;
      if (!L) return;

      // Nettoyer l'ancienne instance (strict-mode / HMR / nouvelle adresse)
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        geojsonRef.current = null;
      }
      (containerRef.current as any)._leaflet_id = undefined;

      // 2. Créer la carte centrée sur le point adresse
      const map = L.map(containerRef.current, {
        scrollWheelZoom  : false,
        zoomControl      : true,
        attributionControl: true,
      }).setView([lat, lng], 18);

      // 3. Fond CartoDB Light
      L.tileLayer(CARTO_TILES, {
        maxZoom     : 21,
        subdomains  : ["a", "b", "c", "d"],
        attribution : CARTO_ATTR,
        detectRetina: true,
      }).addTo(map);

      // 4. Couche WMS IGN — toutes les parcelles + numéros cadastraux
      const wmsLayer = L.tileLayer.wms(IGN_WMS_URL, {
        layers      : "CADASTRALPARCELS.PARCELLAIRE_EXPRESS",
        format      : "image/png",
        transparent : true,
        version     : "1.3.0",
        opacity     : 0.85,
        attribution : "© IGN",
        errorTileUrl: "data:image/png;base64,iVBORw0KGgo=",
      });
      wmsLayer.on("tileerror", () => setWmsError(true));
      wmsLayer.addTo(map);

      // 5. Marqueur rouge sur l'adresse exacte
      L.circleMarker([lat, lng], {
        radius     : 7,
        fillColor  : "#e1000f",
        color      : "#fff",
        weight     : 2.5,
        fillOpacity: 1,
      }).addTo(map);

      mapRef.current = map;
      setReady(true);

      // 6. Afficher le polygone de la parcelle et recentrer dessus
      if (geometry) {
        applyGeojson(L, map, geometry);
        // Extraire la ref depuis la géométrie si pas de prop parcelRef
        const props = (geometry as any)?.properties;
        if (props?.idu) setLocalRef(props.idu);
        else if (props?.section && props?.numero) setLocalRef(`${props.section} ${props.numero}`);
      }
    }

    init();

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        geojsonRef.current = null;
      }
      setReady(false);
      setLocalRef("");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // ──────────────────────────────────────────────────────────────────────────
  // Effet secondaire : si parcelGeometry arrive en prop APRÈS l'init
  // (ex: données serveur plus lentes que l'init Leaflet)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const L   = (window as any).L;
    const map = mapRef.current;
    if (!L || !map || !parcelGeometry) return;
    applyGeojson(L, map, parcelGeometry);
  }, [parcelGeometry]);

  // ──────────────────────────────────────────────────────────────────────────
  // Helper : supprime ancienne couche GeoJSON, ajoute la nouvelle, recentre
  // ──────────────────────────────────────────────────────────────────────────
  function applyGeojson(L: any, map: LMap, geometry: object) {
    if (geojsonRef.current) {
      try { geojsonRef.current.remove(); } catch { /* ignoré */ }
      geojsonRef.current = null;
    }
    try {
      const layer: LGeoLayer = L.geoJSON(geometry, {
        style: {
          color      : "#22c55e",
          weight     : 3,
          fillColor  : "#22c55e",
          fillOpacity: 0.25,
        },
      }).addTo(map);

      geojsonRef.current = layer;

      const bounds = layer.getBounds();
      if (bounds?.isValid?.()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 19 });
      }
    } catch {
      // Géométrie invalide — on garde juste le marqueur
    }
  }

  const displayRef = parcelRef && parcelRef !== "–" ? parcelRef : localRef;

  return (
    <div className="relative overflow-hidden bg-gray-100" style={{ height }}>

      {/* Conteneur Leaflet */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Badge référence cadastrale (superposé, haut gauche) */}
      {displayRef && (
        <div
          className="absolute top-2 left-2 z-[1000] bg-white/96 border-l-4 border-l-green-500 border border-gray-200 px-3 py-2 shadow-md"
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

      {/* Légende couche cadastrale (bas droit) */}
      {!wmsError && (
        <div className="absolute bottom-6 right-2 z-[1000] bg-white/90 border border-gray-200 px-2 py-1 shadow-sm flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border-2 border-green-500 bg-green-500/20 shrink-0" />
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">Parcelle sélectionnée</span>
        </div>
      )}

      {/* Spinner pendant init */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-[999]">
          <div className="w-9 h-9 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
