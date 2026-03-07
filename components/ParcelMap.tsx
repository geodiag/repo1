"use client";

/**
 * ParcelMap — Carte Leaflet (CDN) reproduisant le rendu de france-erp.com :
 *   • Fond CartoDB Light (gris minimaliste, pro)
 *   • WMS IGN data.geopf.fr — toutes les parcelles cadastrales + numéros (sans clé API)
 *   • Polygone GeoJSON de la parcelle ciblée encadrée en vert vif
 *   • Marqueur rouge sur l'adresse exacte
 *   • Badge référence cadastrale superposé
 *
 * Leaflet chargé dynamiquement via CDN — zéro dépendance npm, zéro SSR.
 */

import { useEffect, useRef, useState } from "react";

// ─── Types locaux (évite @types/leaflet) ────────────────────────────────────
type LMap   = { remove: () => void; fitBounds: (b: any, opts?: any) => void; getZoom: () => number };
type LLayer = { getBounds: () => { isValid: () => boolean } };

interface ParcelMapProps {
  lat: number;
  lng: number;
  parcelGeometry?: object | null;
  parcelRef?: string;
  height?: number;
}

// ─── Assets Leaflet (CDN) ────────────────────────────────────────────────────
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// ─── Fond de carte CartoDB Light (identique à france-erp.com) ───────────────
const CARTO_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR  = '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>';

// ─── WMS IGN — parcellaire cadastral (open, sans clé API depuis 2024) ────────
const IGN_WMS_URL = "https://data.geopf.fr/wms-r/ows";

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
    const s     = document.createElement("script");
    s.id        = "leaflet-js";
    s.src       = LEAFLET_JS;
    s.onload    = () => resolve();
    s.onerror   = () => resolve(); // dégradation silencieuse
    document.head.appendChild(s);
  });
}

export default function ParcelMap({
  lat, lng, parcelGeometry, parcelRef, height = 320,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LMap | null>(null);
  const [ready, setReady] = useState(false);
  const [wmsError, setWmsError] = useState(false);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      await injectLeaflet();
      if (destroyed || !containerRef.current) return;

      const L = (window as any).L;
      if (!L) return;

      // Nettoyer instance précédente (strict-mode / HMR)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      (containerRef.current as any)._leaflet_id = undefined;

      // ── 1. Initialisation carte ──────────────────────────────────────────
      const map = L.map(containerRef.current, {
        scrollWheelZoom  : false,
        zoomControl      : true,
        attributionControl: true,
      }).setView([lat, lng], 18);

      // ── 2. Fond CartoDB Light (minimaliste, identique france-erp) ────────
      L.tileLayer(CARTO_TILES, {
        maxZoom    : 21,
        subdomains : ["a", "b", "c", "d"],
        attribution: CARTO_ATTR,
        detectRetina: true,
      }).addTo(map);

      // ── 3. Couche WMS IGN — plan cadastral (toutes parcelles + numéros) ──
      // data.geopf.fr ne nécessite plus de clé API depuis 2024
      const wmsLayer = L.tileLayer.wms(IGN_WMS_URL, {
        layers     : "CADASTRALPARCELS.PARCELLAIRE_EXPRESS",
        format     : "image/png",
        transparent: true,
        version    : "1.3.0",
        opacity    : 0.85,
        attribution: "© IGN",
        // Fallback silencieux si le WMS est indisponible
        errorTileUrl: "data:image/png;base64,iVBORw0KGgo=",
      });

      // Détection d'erreur WMS (serveur parfois lent)
      wmsLayer.on("tileerror", () => {
        if (!wmsError) setWmsError(true);
      });
      wmsLayer.addTo(map);

      // ── 4. Polygone de la parcelle ciblée (vert vif comme france-erp) ───
      if (parcelGeometry) {
        try {
          const layer: LLayer = L.geoJSON(parcelGeometry, {
            style: {
              color      : "#22c55e",   // vert vif — identique france-erp
              weight     : 3,
              fillColor  : "#22c55e",
              fillOpacity: 0.25,
            },
          }).addTo(map);

          const bounds = layer.getBounds();
          if (bounds?.isValid?.()) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 19 });
          }
        } catch {
          // Géométrie invalide — on garde juste le marqueur
        }
      }

      // ── 5. Marqueur adresse (point rouge vif) ────────────────────────────
      L.circleMarker([lat, lng], {
        radius     : 7,
        fillColor  : "#e1000f",  // rouge-marianne
        color      : "#fff",
        weight     : 2.5,
        fillOpacity: 1,
      }).addTo(map);

      mapRef.current = map;
      setReady(true);
    }

    init();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]); // Recréer uniquement si le bien change

  return (
    <div className="relative overflow-hidden bg-gray-100" style={{ height }}>

      {/* Conteneur Leaflet */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Badge référence cadastrale (superposé, haut gauche) */}
      {parcelRef && parcelRef !== "–" && (
        <div
          className="absolute top-2 left-2 z-[1000] bg-white/96 border-l-4 border-l-green-500 border border-gray-200 px-3 py-2 shadow-md"
          style={{ backdropFilter: "blur(6px)" }}
        >
          <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-0.5">
            Parcelle cadastrale · IGN
          </p>
          <p className="text-sm font-black text-gray-900 font-mono tracking-wide">
            📍 {parcelRef}
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
          <div className="w-9 h-9 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
