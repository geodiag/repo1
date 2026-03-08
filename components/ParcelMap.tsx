"use client";

/**
 * ParcelMap — Carte vectorielle MapLibre GL JS via react-map-gl.
 *
 * ── Pourquoi MapLibre ?
 *   • Pas de requêtes WMS → zéro 429 IGN
 *   • Style vectoriel rendu côté GPU → fluide et professionnel
 *   • API React native : <Source> + <Layer> pour le GeoJSON, pas de hack CDN
 *
 * ── Architecture React (pas de boucle de re-renders)
 *   1. <Map initialViewState>  → initialise la carte une seule fois
 *   2. Effect [lat, lng]       → flyTo quand l'adresse change
 *   3. Effect [parcelGeometry] → fitBounds sur la parcelle (via turf.bbox)
 *
 * ── Import dans le parent (obligatoire — MapLibre nécessite le DOM/WebGL)
 *   const ParcelMap = dynamic(() => import("@/components/ParcelMap"), { ssr: false });
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  AttributionControl,
} from "react-map-gl/maplibre";
import type { MapRef, LayerProps } from "react-map-gl/maplibre";
import bbox from "@turf/bbox";

// ─── CSS MapLibre GL (tuiles + contrôles) ─────────────────────────────────────
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Style de fond : CartoDB Positron ─────────────────────────────────────────
// Propre, professionnel, SaaS-style — aucun rate-limit, aucune clé API requise.
const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// ─── Styles des couches GeoJSON de la parcelle ────────────────────────────────
const LAYER_FILL: LayerProps = {
  id  : "parcel-fill",
  type: "fill",
  paint: {
    "fill-color"  : "#10b981",   // émeraude
    "fill-opacity": 0.35,
  },
};

const LAYER_OUTLINE: LayerProps = {
  id  : "parcel-outline",
  type: "line",
  paint: {
    "line-color": "#059669",     // émeraude foncé
    "line-width": 2.5,
    "line-opacity": 0.9,
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ParcelMapProps {
  lat: number;
  lng: number;
  /** GeoJSON Feature ou FeatureCollection (optionnel — fourni par le parent) */
  parcelGeometry?: object | null;
  parcelRef?: string;
  height?: number;
}

export default function ParcelMap({
  lat,
  lng,
  parcelGeometry,
  parcelRef,
  height = 320,
}: ParcelMapProps) {
  const mapRef = useRef<MapRef>(null);

  // La carte est-elle initialisée et prête à recevoir des commandes ?
  const [mapLoaded, setMapLoaded] = useState(false);

  // Callback transmis à <Map onLoad> — déclenche les effets dépendant de `mapLoaded`
  const onMapLoad = useCallback(() => setMapLoaded(true), []);

  // ════════════════════════════════════════════════════════════════════════════
  // NORMALISATION GEOJSON — garantit un FeatureCollection valide pour MapLibre.
  //
  // MapLibre accepte : Feature | FeatureCollection | Geometry
  // Mais certaines APIs retournent directement une Geometry brute (sans "type:Feature")
  // → on enveloppe systématiquement dans une FeatureCollection pour être sûr.
  //
  // Cas traités :
  //   null / undefined        → null (Source non rendue)
  //   { type: "FeatureCollection" } → passé tel quel
  //   { type: "Feature" }     → encapsulé dans une FeatureCollection
  //   { type: "Polygon"|... } → encapsulé dans Feature → FeatureCollection
  // ════════════════════════════════════════════════════════════════════════════
  const formattedGeojson = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!parcelGeometry) return null;
    const g = parcelGeometry as any;

    if (g.type === "FeatureCollection") {
      // Déjà au bon format
      return g as GeoJSON.FeatureCollection;
    }

    if (g.type === "Feature") {
      // Encapsule dans une FeatureCollection
      return { type: "FeatureCollection", features: [g] };
    }

    // Géométrie brute (Polygon, MultiPolygon…) → Feature → FeatureCollection
    if (g.type && g.coordinates) {
      return {
        type    : "FeatureCollection",
        features: [{ type: "Feature", geometry: g, properties: {} }],
      };
    }

    // Format inconnu — on tente quand même de le passer à MapLibre
    console.warn("[ParcelMap] Format GeoJSON inattendu :", g.type ?? typeof g);
    return null;
  }, [parcelGeometry]);

  // ════════════════════════════════════════════════════════════════════════════
  // EFFET NAVIGATION — Centrer la carte sur la nouvelle adresse
  // S'exécute quand lat/lng change (nouvelle saisie utilisateur).
  // fitBounds() surpassera ce flyTo si parcelGeometry arrive juste après.
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    mapRef.current.flyTo({
      center  : [lng, lat],
      zoom    : 17,
      duration: 600,
    });
  }, [lat, lng, mapLoaded]);

  // ════════════════════════════════════════════════════════════════════════════
  // EFFET FITBOUNDS — Centrer et zoomer sur la parcelle quand le GeoJSON arrive
  // Utilise @turf/bbox pour extraire [minLng, minLat, maxLng, maxLat]
  // puis react-map-gl fitBounds avec animation fluide.
  // ════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !formattedGeojson) return;

    try {
      // turf.bbox retourne [minX, minY, maxX, maxY] = [minLng, minLat, maxLng, maxLat]
      const [minLng, minLat, maxLng, maxLat] = bbox(formattedGeojson);

      mapRef.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        {
          padding : 60,       // espace autour du polygone (px)
          duration: 1000,     // animation fluide 1 s
          maxZoom : 19,
        }
      );
    } catch (e) {
      console.warn("[ParcelMap] fitBounds error:", e);
    }
  }, [formattedGeojson, mapLoaded]);

  return (
    <div
      className="relative overflow-hidden rounded-lg shadow-md"
      style={{ height }}
    >
      {/* ── Carte MapLibre GL ─────────────────────────────────────────────── */}
      <Map
        ref={mapRef}
        initialViewState={{
          latitude : lat,
          longitude: lng,
          zoom     : 17,
        }}
        mapStyle={STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        onLoad={onMapLoad}
        // Désactiver le logo MapLibre (remplacé par l'attribution CartoDB)
        attributionControl={false}
      >
        {/* ── Contrôle de zoom (haut droit) ─────────────────────────────── */}
        <NavigationControl position="top-right" showCompass={false} />

        {/* ── Attribution discrète (bas droit) ──────────────────────────── */}
        <AttributionControl
          position="bottom-right"
          style={{ fontSize: "9px", opacity: 0.6 }}
          customAttribution="© CartoDB © OSM"
        />

        {/* ── Polygone de la parcelle cadastrale ────────────────────────── */}
        {formattedGeojson && (
          <Source
            id="parcel"
            type="geojson"
            data={formattedGeojson}
          >
            {/* Remplissage émeraude semi-transparent */}
            <Layer {...LAYER_FILL} />
            {/* Contour émeraude plein */}
            <Layer {...LAYER_OUTLINE} />
          </Source>
        )}
      </Map>

      {/* ── Badge debug GeoJSON (haut droit, fond sombre) ─────────────────── */}
      {/* À SUPPRIMER une fois le polygone confirmé en production             */}
      <div className="absolute top-2 right-2 z-[9999] flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono font-bold shadow"
        style={{ background: "rgba(0,0,0,0.65)", color: "#fff", backdropFilter: "blur(4px)" }}
      >
        {formattedGeojson
          ? <><span style={{ color: "#4ade80" }}>🟢</span> GeoJSON : Validé ({formattedGeojson.features?.length ?? "?"} feat.)</>
          : <><span style={{ color: "#f87171" }}>🔴</span> GeoJSON : Null</>
        }
      </div>

      {/* ── Badge référence cadastrale (superposé haut gauche) ────────────── */}
      {parcelRef && parcelRef !== "–" && (
        <div
          className="absolute top-2 left-2 z-10 bg-white/95 border-l-4 border-l-emerald-500 border border-gray-200 px-3 py-2 shadow-md"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <p className="text-[9px] uppercase font-black text-gray-400 tracking-widest mb-0.5">
            Parcelle cadastrale · IGN
          </p>
          <p className="text-sm font-black text-gray-900 font-mono tracking-wide">
            📍 {parcelRef}
          </p>
        </div>
      )}

      {/* ── Légende polygone (bas gauche) ─────────────────────────────────── */}
      {formattedGeojson && (
        <div className="absolute bottom-6 left-2 z-10 bg-white/90 border border-gray-200 px-2 py-1 shadow-sm flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2 border-emerald-500 bg-emerald-500/30 shrink-0" />
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">
            Parcelle sélectionnée
          </span>
        </div>
      )}

      {/* ── Spinner pendant l'initialisation MapLibre ─────────────────────── */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-20">
          <div className="w-9 h-9 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
