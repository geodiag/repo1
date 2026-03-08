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
  const [mapLoaded, setMapLoaded] = useState(false);
  const onLoad             = useCallback(() => setMapLoaded(true), []);

  // ── Normalisation GeoJSON (mémoïsée — ne recalcule que si parcelGeometry change)
  const geojson = useMemo<GeoJSON.FeatureCollection | null>(
    () => (parcelGeometry ? toFeatureCollection(parcelGeometry) : null),
    [parcelGeometry],
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
        {geojson
          ? <span style={{ color: "#4ade80" }}>🟢 GeoJSON OK — {geojson.features.length} feat.</span>
          : <span style={{ color: "#f87171" }}>🔴 GeoJSON null</span>
        }
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
