"use client";

/**
 * ParcelMap — Carte vectorielle MapLibre GL JS (via react-map-gl).
 * Design clone de France-ERP : Positron + parcelle bleu marine.
 *
 * Import obligatoire dans le parent (SSR interdit — WebGL requis) :
 *   const ParcelMap = dynamic(() => import("@/components/ParcelMap"), { ssr: false });
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Map, { Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef, LayerProps } from "react-map-gl/maplibre";
import bbox from "@turf/bbox";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Fond vectoriel CartoDB Positron ─────────────────────────────────────────
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// ─── Styles de la parcelle — palette France-ERP (bleu marine) ────────────────
const FILL_LAYER: LayerProps = {
  id  : "parcel-fill",
  type: "fill",
  paint: {
    "fill-color"  : "#3b82f6",
    "fill-opacity": 0.15,
  },
};

const LINE_LAYER: LayerProps = {
  id  : "parcel-line",
  type: "line",
  paint: {
    "line-color": "#1e3a8a",
    "line-width": 3,
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ParcelMapProps {
  lat          : number;
  lng          : number;
  parcelGeometry?: object | null;
  parcelRef    ?: string;
  /** Accepte un nombre (px) ou une chaîne CSS ("100%", "50vh"…) */
  height       ?: number | string;
}

// ─── Helper : normalise n'importe quel objet GeoJSON en FeatureCollection ─────
// MapLibre accepte Feature | FeatureCollection | Geometry,
// mais certaines APIs IGN retournent une Geometry brute sans enveloppe.
function toFeatureCollection(raw: object): GeoJSON.FeatureCollection | null {
  const g = raw as any;

  if (!g || !g.type) return null;

  if (g.type === "FeatureCollection") {
    return g as GeoJSON.FeatureCollection;
  }

  if (g.type === "Feature") {
    return { type: "FeatureCollection", features: [g] };
  }

  // Géométrie brute : Polygon, MultiPolygon, GeometryCollection…
  if (g.coordinates || g.geometries) {
    return {
      type    : "FeatureCollection",
      features: [{ type: "Feature", geometry: g, properties: {} }],
    };
  }

  console.warn("[ParcelMap] format GeoJSON non reconnu :", g.type);
  return null;
}

// ─── Composant ────────────────────────────────────────────────────────────────
export default function ParcelMap({
  lat,
  lng,
  parcelGeometry,
  parcelRef,
  height = 320,
}: ParcelMapProps) {
  const mapRef             = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded]         = useState(false);
  const [clientGeometry, setClientGeometry] = useState<object | null>(null);
  const onLoad             = useCallback(() => setMapLoaded(true), []);

  // ── Fallback client-side : si parcelGeometry est null (API serveur a échoué),
  // le navigateur fait lui-même l'appel APICarto IGN avec ses propres headers
  // HTTP (User-Agent, Origin browser) — beaucoup plus fiable que depuis Vercel.
  useEffect(() => {
    // Si le parent a déjà fourni la géométrie, pas besoin de fetcher
    if (parcelGeometry) { setClientGeometry(null); return; }

    let cancelled = false;
    setClientGeometry(null);

    async function fetchClientSide() {
      // Tentative 1 : APICarto IGN (point exact, résultat le plus précis)
      try {
        const url = `https://apicarto.ign.fr/api/cadastre/parcelle?lon=${lng}&lat=${lat}&_limit=1`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal : AbortSignal.timeout(7000),
        });
        if (res.ok) {
          const json = await res.json();
          const feat = json.features?.[0];
          if (feat?.geometry && !cancelled) {
            console.log('[ParcelMap] géométrie ← APICarto (client-side)');
            setClientGeometry({ type: 'Feature', geometry: feat.geometry, properties: feat.properties ?? {} });
            return;
          }
        }
        console.warn('[ParcelMap] APICarto vide ou KO:', res.status);
      } catch (e) {
        console.warn('[ParcelMap] APICarto client-side KO:', e);
      }

      // Tentative 2 : WFS Géoportail (CORS garanti, data.geopf.fr)
      try {
        const d   = 0.0003;
        const url = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature`
          + `&TYPENAMES=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle`
          + `&OUTPUTFORMAT=application/json&count=1`
          + `&BBOX=${lng - d},${lat - d},${lng + d},${lat + d},EPSG:4326`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const json = await res.json();
          const feat = json.features?.[0];
          if (feat?.geometry && !cancelled) {
            console.log('[ParcelMap] géométrie ← WFS Géoportail (client-side)');
            setClientGeometry({ type: 'Feature', geometry: feat.geometry, properties: feat.properties ?? {} });
            return;
          }
        }
      } catch (e) {
        console.warn('[ParcelMap] WFS client-side KO:', e);
      }

      console.warn('[ParcelMap] aucune source n\'a retourné de géométrie pour', lat, lng);
    }

    fetchClientSide();
    return () => { cancelled = true; };
  }, [lat, lng, parcelGeometry]); // relance si nouvelle adresse OU si prop arrive

  // ── Normalisation GeoJSON — prop parent en priorité, sinon fetch client-side
  const geojson = useMemo<GeoJSON.FeatureCollection | null>(
    () => {
      const raw = parcelGeometry ?? clientGeometry;
      return raw ? toFeatureCollection(raw) : null;
    },
    [parcelGeometry, clientGeometry],
  );

  // ── Navigation → flyTo quand lat/lng change (nouvelle adresse saisie)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 700 });
  }, [lat, lng, mapLoaded]);

  // ── FitBounds → zoom automatique sur la parcelle dès que le GeoJSON arrive
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !geojson) return;
    try {
      const [west, south, east, north] = bbox(geojson);
      mapRef.current.fitBounds(
        [[west, south], [east, north]],
        { padding: 50, duration: 1000, maxZoom: 19 },
      );
    } catch (err) {
      console.warn("[ParcelMap] fitBounds —", err);
    }
  }, [geojson, mapLoaded]);

  // height peut être number (→ React ajoute "px") ou string CSS ("100%", "50vh"…)
  const containerStyle = {
    height: typeof height === "number" ? height : height,
  };

  return (
    <div className="relative w-full overflow-hidden" style={containerStyle}>

      {/* ── Carte MapLibre ──────────────────────────────────────────────────── */}
      <Map
        ref={mapRef}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 17 }}
        mapStyle={STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        onLoad={onLoad}
        attributionControl={false}
      >
        {/* Zoom +/- haut gauche, sans boussole */}
        <NavigationControl position="top-left" showCompass={false} />

        {/* Polygone de la parcelle */}
        {geojson && (
          <Source id="parcel" type="geojson" data={geojson}>
            <Layer {...FILL_LAYER} />
            <Layer {...LINE_LAYER} />
          </Source>
        )}
      </Map>

      {/* ── Encart statut bas gauche (style France-ERP) ─────────────────────── */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-white border border-gray-200 shadow px-3 py-2 pointer-events-none">
        {geojson ? (
          <>
            <span
              className="inline-block w-3 h-3 shrink-0 border border-[#1e3a8a]"
              style={{ background: "rgba(59,130,246,0.25)" }}
            />
            <span className="text-[10px] font-extrabold tracking-widest text-gray-700 uppercase">
              Parcelle identifiée
            </span>
          </>
        ) : (
          <>
            <span className="inline-block w-3 h-3 shrink-0 bg-gray-300 border border-gray-400" />
            <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">
              Recherchez une adresse
            </span>
          </>
        )}
      </div>

      {/* ── Badge référence cadastrale haut droit ──────────────────────────── */}
      {parcelRef && parcelRef !== "–" && (
        <div
          className="absolute top-2 right-2 z-10 bg-white/95 border-l-4 border-l-[#1e3a8a] border border-gray-200 px-3 py-2 shadow-md"
          style={{ backdropFilter: "blur(6px)" }}
        >
          <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-0.5">
            Parcelle · IGN
          </p>
          <p className="text-sm font-black text-gray-900 font-mono tracking-wide">
            📍 {parcelRef}
          </p>
        </div>
      )}

      {/* ── Badge debug GeoJSON ─────────────────────────────────────────────── */}
      {/* ⚠ À SUPPRIMER en production */}
      <div
        className="absolute top-2 left-10 z-[9999] flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[9px] font-bold shadow pointer-events-none"
        style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
      >
        {geojson ? (
          <span style={{ color: "#4ade80" }}>
            🟢 GeoJSON OK ({parcelGeometry ? "serveur" : "client"}) — {geojson.features.length} feat.
          </span>
        ) : (
          <span style={{ color: "#f87171" }}>
            🔴 GeoJSON null {lat ? "⏳ fetch…" : "— pas de coords"}
          </span>
        )}
      </div>

      {/* ── Spinner init ────────────────────────────────────────────────────── */}
      {!mapLoaded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50/80">
          <div className="w-9 h-9 border-4 border-gray-200 border-t-[#1e3a8a] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
