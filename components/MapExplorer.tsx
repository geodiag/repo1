"use client";

/**
 * MapExplorer — Carte grande surface inspirée de france-erp.com
 *
 * Stack :
 *   • Leaflet 1.9.4 (CDN)
 *   • Fond CartoDB Light  → même rendu que france-erp.com
 *   • WMS IGN data.geopf.fr → plan cadastral (toutes parcelles, sans clé API)
 *   • WFS IGN data.geopf.fr → features interactives au zoom ≥ 15
 *   • Hover → tooltip coloré : INSEE · Préfixe · Section · N° · Surface
 *   • Parcelle ciblée encadrée en vert vif
 */

import { useEffect, useRef, useState } from "react";

// ─── Leaflet CDN ─────────────────────────────────────────────────────────────
const L_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const L_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

// ─── Tiles ───────────────────────────────────────────────────────────────────
const CARTO = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const IGN_WMS = "https://data.geopf.fr/wms-r/ows";
const IGN_WFS = "https://data.geopf.fr/wfs/ows";

// ─── Tooltip CSS injecté une seule fois ──────────────────────────────────────
const TOOLTIP_CSS = `
.geo-tip.leaflet-tooltip {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0;
  box-shadow: 0 8px 24px rgba(0,0,0,.14);
  padding: 0;
  min-width: 176px;
  pointer-events: none;
}
.geo-tip.leaflet-tooltip::before { display: none; }
.geo-tip-inner  { padding: 10px 13px 11px; }
.geo-tip-title  {
  font-size: 9px; text-transform: uppercase; letter-spacing: .1em;
  color: #9ca3af; font-weight: 800;
  padding-bottom: 6px; margin-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
}
.geo-tip-row   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.geo-tip-row:last-child { margin-bottom: 0; }
.geo-tip-lbl   { font-size: 9px; color: #9ca3af; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.geo-tip-val   { font-size: 12px; font-weight: 900; font-family: ui-monospace, monospace; }
.geo-tip-blue  { color: #003189; }
.geo-tip-green { color: #16a34a; }
.geo-tip-org   { color: #ea580c; }
.geo-tip-gray  { color: #374151; }
`;

// ─── Props ───────────────────────────────────────────────────────────────────
interface MapExplorerProps {
  /** Coordonnées de l'adresse sélectionnée */
  lat?: number | null;
  lng?: number | null;
  /** GeoJSON Feature de la parcelle ciblée */
  parcelGeometry?: object | null;
  /** Référence cadastrale affichée en badge */
  parcelRef?: string;
  /** CSS height — défaut 100% */
  height?: number | string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function injectLeaflet(): Promise<void> {
  return new Promise((resolve) => {
    // CSS Leaflet
    if (!document.getElementById("_lcss")) {
      const l = document.createElement("link");
      l.id = "_lcss"; l.rel = "stylesheet"; l.href = L_CSS;
      document.head.appendChild(l);
    }
    // CSS tooltip (une seule fois)
    if (!document.getElementById("_gtip")) {
      const s = document.createElement("style");
      s.id = "_gtip"; s.textContent = TOOLTIP_CSS;
      document.head.appendChild(s);
    }
    if ((window as any).L) return resolve();
    if (document.getElementById("_ljs")) {
      const t = setInterval(() => { if ((window as any).L) { clearInterval(t); resolve(); } }, 40);
      return;
    }
    const sc = document.createElement("script");
    sc.id = "_ljs"; sc.src = L_JS;
    sc.onload = () => resolve();
    sc.onerror = () => resolve();
    document.head.appendChild(sc);
  });
}

/** Construit le HTML du tooltip survol */
function tooltipHTML(p: Record<string, any>): string {
  // Extraction défensive : les noms de champs varient légèrement selon la version WFS
  const insee   = p.code_commune || p.code_insee
                  || (typeof p.id_parcelle === "string" ? p.id_parcelle.slice(0, 5) : null)
                  || "–";
  const prefixe = p.prefixe ?? p.code_arr ?? "000";
  const section = p.section ?? "–";
  const numero  = p.numero  ?? p.numero_parcelle ?? "–";
  // contenance = centiares (1 ca = 1 m²/100) → on divise par 100 pour avoir les ares,
  // puis * 100 pour m² = on divise juste par 1 pour m² si contenance est en m²
  // En réalité IGN envoie des centiares : 1 are = 100 m² = 10 000 ca → 1 ca = 0.01 m²
  const surfaceM2 = p.contenance
    ? `${Math.round(p.contenance / 100).toLocaleString("fr-FR")} m²`
    : "–";

  return `
    <div class="geo-tip-inner">
      <div class="geo-tip-title">Parcelle cadastrale</div>
      <div class="geo-tip-row">
        <span class="geo-tip-lbl">INSEE</span>
        <span class="geo-tip-val geo-tip-blue">${insee}</span>
      </div>
      <div class="geo-tip-row">
        <span class="geo-tip-lbl">Préfixe</span>
        <span class="geo-tip-val geo-tip-gray">${prefixe}</span>
      </div>
      <div class="geo-tip-row">
        <span class="geo-tip-lbl">Section</span>
        <span class="geo-tip-val geo-tip-green">${section}</span>
      </div>
      <div class="geo-tip-row">
        <span class="geo-tip-lbl">N°</span>
        <span class="geo-tip-val geo-tip-org">${numero}</span>
      </div>
      <div class="geo-tip-row">
        <span class="geo-tip-lbl">Surface</span>
        <span class="geo-tip-val geo-tip-gray">${surfaceM2}</span>
      </div>
    </div>`;
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function MapExplorer({
  lat, lng, parcelGeometry, parcelRef, height = "100%",
}: MapExplorerProps) {
  const divRef          = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const wfsLayerRef     = useRef<any>(null);   // couche parcelles WFS interactive
  const selectedRef     = useRef<any>(null);   // parcelle ciblée (verte)
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);
  const [ready,         setReady]         = useState(false);
  const [loadingWFS,    setLoadingWFS]    = useState(false);
  const [zoom,          setZoom]          = useState(6);

  // ── Init carte (une seule fois) ──────────────────────────────────────────
  useEffect(() => {
    let dead = false;

    async function boot() {
      await injectLeaflet();
      if (dead || !divRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      // Nettoyage éventuel (HMR / strict-mode)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      (divRef.current as any)._leaflet_id = undefined;

      // Vue initiale : France entière ou bien ciblé
      const initLat  = lat  ?? 46.603;
      const initLng  = lng  ?? 1.888;
      const initZoom = lat  ? 17 : 6;

      const map = L.map(divRef.current, {
        scrollWheelZoom: true,
        zoomControl    : true,
      }).setView([initLat, initLng], initZoom);

      // ── Fond CartoDB Light (identique france-erp.com) ──────────────────
      L.tileLayer(CARTO, {
        maxZoom     : 21,
        subdomains  : ["a", "b", "c", "d"],
        detectRetina: true,
        attribution : '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      // ── WMS IGN — plan cadastral (fond visuel, tous niveaux de zoom) ───
      L.tileLayer.wms(IGN_WMS, {
        layers     : "CADASTRALPARCELS.PARCELLAIRE_EXPRESS",
        format     : "image/png",
        transparent: true,
        version    : "1.3.0",
        opacity    : 0.65,
        attribution: "© IGN",
      }).addTo(map);

      // ── Couche WFS interactive (remplie dynamiquement) ─────────────────
      wfsLayerRef.current  = L.layerGroup().addTo(map);
      // ── Couche parcelle sélectionnée ───────────────────────────────────
      selectedRef.current  = L.geoJSON(null, {
        style: { color: "#22c55e", weight: 3, fillColor: "#22c55e", fillOpacity: 0.28 },
      }).addTo(map);

      // ── Chargement WFS au mouvement ─────────────────────────────────────
      const triggerWFS = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => fetchWFS(map, L), 450);
      };
      map.on("moveend zoomend", triggerWFS);
      triggerWFS();   // charge immédiatement

      mapRef.current = map;
      setReady(true);
    }

    boot();
    return () => {
      dead = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Charger les features WFS pour le viewport ──────────────────────────────
  async function fetchWFS(map: any, L: any) {
    const z = map.getZoom();
    setZoom(z);

    if (z < 15) {
      // Trop dézoomé — effacer les features interactives (WMS reste visible)
      wfsLayerRef.current?.clearLayers();
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoadingWFS(true);

    const b   = map.getBounds();
    const bbox = `${b.getWest().toFixed(6)},${b.getSouth().toFixed(6)},${b.getEast().toFixed(6)},${b.getNorth().toFixed(6)},CRS:84`;
    const url  = `${IGN_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature`
               + `&TYPENAME=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:parcelle`
               + `&OUTPUTFORMAT=application/json&SRSNAME=CRS:84&COUNT=350&BBOX=${bbox}`;

    try {
      const res = await fetch(url, { signal: abortRef.current.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`WFS ${res.status}`);
      const gj: any = await res.json();

      wfsLayerRef.current.clearLayers();

      L.geoJSON(gj, {
        style: {
          // Transparent par défaut : l'utilisateur voit le WMS en dessous
          color      : "#003189",
          weight     : 0,
          fillOpacity: 0,
          fillColor  : "#003189",
        },
        onEachFeature(feature: any, layer: any) {
          // Tooltip sticky coloré
          layer.bindTooltip(tooltipHTML(feature.properties), {
            sticky   : true,
            direction: "right",
            offset   : [14, 0],
            opacity  : 1,
            className: "geo-tip",
          });

          layer.on({
            mouseover(e: any) {
              e.target.setStyle({ weight: 2, fillOpacity: 0.18 });
              e.target.bringToFront();
            },
            mouseout(e: any) {
              e.target.setStyle({ weight: 0, fillOpacity: 0 });
            },
          });
        },
      }).addTo(wfsLayerRef.current);

    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("[MapExplorer] WFS error:", err?.message);
      }
    } finally {
      setLoadingWFS(false);
    }
  }

  // ── Naviguer vers l'adresse quand les coords changent ────────────────────
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;
    mapRef.current.flyTo([lat, lng], 18, { duration: 0.8 });
  }, [lat, lng]);

  // ── Mettre à jour la parcelle sélectionnée (verte) ───────────────────────
  useEffect(() => {
    if (!selectedRef.current) return;
    selectedRef.current.clearLayers();
    if (!parcelGeometry) return;
    const L = (window as any).L;
    if (!L) return;
    try {
      selectedRef.current.addData(parcelGeometry as any);
    } catch { /* géométrie invalide */ }
  }, [parcelGeometry]);

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full overflow-hidden bg-[#e8e4dc]" style={{ height }}>

      {/* Conteneur Leaflet */}
      <div ref={divRef} className="absolute inset-0" />

      {/* Badge parcelle ciblée ── superposé haut-gauche */}
      {ready && parcelRef && parcelRef !== "–" && (
        <div className="absolute top-3 left-3 z-[1000] bg-white shadow-lg border-l-[3px] border-l-green-500 border border-gray-200 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest font-black text-gray-400 mb-0.5">
            Parcelle ciblée · IGN
          </p>
          <p className="text-sm font-black text-gray-900 font-mono">📍 {parcelRef}</p>
        </div>
      )}

      {/* Légende hover (bas gauche) — visible uniquement quand zoom ≥ 15 */}
      {ready && zoom >= 15 && (
        <div className="absolute bottom-8 left-3 z-[1000] bg-white/90 border border-gray-200 px-3 py-2 shadow flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#003189]/20 border-2 border-[#003189] shrink-0" />
          <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">
            Survolez une parcelle pour l'identifier
          </span>
        </div>
      )}

      {/* Hint "zoomez" — visible sous zoom 15 quand une adresse est sélectionnée */}
      {ready && zoom < 15 && lat && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-black/65 text-white text-[11px] font-bold px-4 py-2 rounded-full pointer-events-none">
          Zoomez pour identifier les parcelles
        </div>
      )}

      {/* Spinner WFS (bas droit, petit) */}
      {loadingWFS && (
        <div className="absolute bottom-8 right-3 z-[1000] bg-white/90 border border-gray-200 px-3 py-1.5 shadow flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-gray-300 border-t-bleu-france rounded-full animate-spin shrink-0" />
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">Chargement parcelles…</span>
        </div>
      )}

      {/* Spinner d'init carte */}
      {!ready && (
        <div className="absolute inset-0 z-[999] bg-[#e8e4dc] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-bleu-france rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
