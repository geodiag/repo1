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
  /** Section cadastrale ciblée — utilisée pour le highlighting WFS côté client */
  parcelSection?: string;
  /** Numéro de parcelle ciblé — utilisé pour le highlighting WFS côté client */
  parcelNumero?: string;
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
  // contenance IGN = centiares. 1 centiare = 1 m² (1 are = 100 m² = 100 ca)
  // → on affiche directement la valeur, sans division
  const surfaceM2 = p.contenance
    ? `${Math.round(p.contenance).toLocaleString("fr-FR")} m²`
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
  lat, lng, parcelGeometry, parcelRef, parcelSection, parcelNumero, height = "100%",
}: MapExplorerProps) {
  const divRef          = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const wfsLayerRef     = useRef<any>(null);   // couche parcelles WFS interactive
  const selectedRef     = useRef<any>(null);   // parcelle ciblée (verte)
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef        = useRef<AbortController | null>(null);
  const targetSectionRef = useRef<string | null>(null);  // section cadastrale ciblée
  const targetNumeroRef  = useRef<string | null>(null);  // numéro de parcelle ciblé
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
      // NOTE : la couche de parcelle sélectionnée est créée dynamiquement
      // dans le useEffect [parcelGeometry, ready] — pas ici.

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
          const p = feature.properties;

          // ── Détection de la parcelle ciblée (matching section + numéro WFS) ──
          // On lit les refs au moment de l'appel → valeur toujours à jour
          const sec = targetSectionRef.current;
          const num = targetNumeroRef.current;
          const isTarget = !!(
            sec && num && sec !== "–" && num !== "–"
            && p.section === sec && p.numero === num
          );

          // Style initial : transparent pour toutes sauf la parcelle ciblée
          if (isTarget) {
            layer.setStyle({
              color      : "#000091",
              weight     : 2,
              fillColor  : "#000091",
              fillOpacity: 0.12,
            });
            // Passer au premier plan après que Leaflet a fini de rendre la couche
            setTimeout(() => layer.bringToFront(), 0);
          }

          // Tooltip sticky coloré
          layer.bindTooltip(tooltipHTML(p), {
            sticky   : true,
            direction: "right",
            offset   : [14, 0],
            opacity  : 1,
            className: "geo-tip",
          });

          layer.on({
            mouseover(e: any) {
              e.target.setStyle({ weight: 2, fillOpacity: isTarget ? 0.22 : 0.18 });
              e.target.bringToFront();
            },
            mouseout(e: any) {
              if (isTarget) {
                // Restaurer le style "ciblé" — ne pas effacer le contour bleu
                e.target.setStyle({
                  color      : "#000091",
                  weight     : 2,
                  fillColor  : "#000091",
                  fillOpacity: 0.12,
                });
              } else {
                e.target.setStyle({ weight: 0, fillOpacity: 0 });
              }
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

  // ── Mettre à jour la parcelle ciblée quand section/numéro changent ────────
  // On stocke les valeurs dans des refs (pas de re-render) puis on recharge
  // le WFS pour que onEachFeature applique le style highlight sur la bonne parcelle.
  useEffect(() => {
    targetSectionRef.current = parcelSection ?? null;
    targetNumeroRef.current  = parcelNumero  ?? null;

    if (!ready || !mapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Déclencher immédiatement un re-fetch WFS pour appliquer le highlighting
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchWFS(mapRef.current, L), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelSection, parcelNumero, ready]);

  // ── Parcelle sélectionnée — recréer la couche à chaque changement ────────
  // Dépend aussi de `ready` pour éviter le race condition :
  // si la géométrie arrive avant la fin du boot async, l'effet se relancera
  // une fois la carte prête au lieu de sortir silencieusement.
  useEffect(() => {
    const L = (window as any).L;
    if (!ready || !L || !mapRef.current) return;

    // Supprimer l'ancienne couche si elle existe
    if (selectedRef.current) {
      selectedRef.current.remove();
      selectedRef.current = null;
    }
    if (!parcelGeometry) return;

    try {
      // On recrée la couche directement avec les données → le style s'applique
      // correctement via la forme fonction (plus fiable que l'objet statique)
      selectedRef.current = L.geoJSON(parcelGeometry as any, {
        style: () => ({
          color      : "#000091",
          weight     : 1.5,
          fillColor  : "#000091",
          fillOpacity: 0.08,
        }),
      }).addTo(mapRef.current);
    } catch (e) {
      console.warn("[MapExplorer] Géométrie parcelle invalide :", e);
    }
  }, [parcelGeometry, ready]); // `ready` garantit que mapRef.current est initialisé

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full overflow-hidden bg-[#e8e4dc]" style={{ height }}>

      {/* Conteneur Leaflet */}
      <div ref={divRef} className="absolute inset-0" />

      {/* Badge parcelle ciblée ── superposé haut-gauche */}
      {ready && parcelRef && parcelRef !== "–" && (
        <div className="absolute top-3 left-3 z-[1000] bg-white shadow-lg border-l-[3px] border-l-bleu-france border border-gray-200 px-3 py-2">
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
