"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import AddressSearch from "./AddressSearch";
import ReassuranceBlock from "./ReassuranceBlock";

// MapExplorer est client-only — on l'exclut du SSR
const MapExplorer = dynamic(() => import("./MapExplorer"), { ssr: false });

interface MapCoords {
  lat: number;
  lng: number;
  label: string;
}

export default function HeroSection() {
  const [mapCoords, setMapCoords]   = useState<MapCoords | null>(null);
  // La géométrie GeoJSON + référence cadastrale + section/numéro, remontées par AddressSearch
  const [parcelData, setParcelData] = useState<{
    geoJSON : object | null;
    ref     : string;
    section : string;
    numero  : string;
  } | null>(null);

  return (
    /**
     * Layout split-panel inspiré de france-erp.com :
     *   mobile  → colonne unique (carte cachée)
     *   lg+     → grille 42 % / 58 % — gauche défilante, droite sticky
     */
    <div className="flex flex-col lg:grid lg:grid-cols-[42%_58%] lg:items-stretch">

      {/* ══════════════════════════════════════════════════════════════════
          COLONNE GAUCHE — texte + recherche + résultats (défilable)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-8 overflow-y-auto px-6 py-10 md:px-10 md:py-14 bg-fond-gris">

        {/* ── Hero texte ─────────────────────────────────────────────── */}
        <div>
          <span className="inline-block bg-green-100 text-green-800 font-bold px-3 py-1 text-sm mb-4 border border-green-300">
            ERP + ENSA inclus — 9,90 €
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            Connaître les risques et obligations de votre bien.
          </h1>
          <p className="text-base text-gray-600 leading-relaxed">
            Obtenez immédiatement votre ERP (État des Risques) et votre
            vérification ENSA (Nuisances Sonores Aériennes) en une seule
            démarche. La parcelle cadastrale est identifiée en temps réel sur
            la carte.
          </p>
        </div>

        {/* ── Formulaire de recherche ─────────────────────────────────── */}
        <div className="bg-white shadow-dsfr border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="text-bleu-france">🔍</span>
              Rechercher un dossier immobilier
            </h2>
          </div>
          <div className="px-6 py-5">
            <AddressSearch
              onResultsChange={() => undefined}
              onAddressSelect={setMapCoords}
              onParcelData={setParcelData}
            />
          </div>
        </div>

        {/* ── Carte mobile (lg:hidden) — visible sur mobile uniquement ── */}
        {mapCoords && (
          <div className="lg:hidden aspect-video border-2 border-white shadow-dsfr overflow-hidden">
            <MapExplorer
              lat={mapCoords.lat}
              lng={mapCoords.lng}
              parcelGeometry={parcelData?.geoJSON}
              parcelRef={parcelData?.ref}
              parcelSection={parcelData?.section}
              parcelNumero={parcelData?.numero}
              height="100%"
            />
          </div>
        )}

        {/* ── Bloc Réassurance ─────────────────────────────────────────── */}
        <div>
          <ReassuranceBlock />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          COLONNE DROITE — MapExplorer sticky (desktop uniquement)
          Montée uniquement après saisie d'une adresse pour éviter
          les requêtes WMS/WFS inutiles au chargement de la page.
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex sticky top-0 h-screen items-center justify-center bg-[#e8e4dc]">
        {mapCoords ? (
          <MapExplorer
            lat={mapCoords.lat}
            lng={mapCoords.lng}
            parcelGeometry={parcelData?.geoJSON}
            parcelRef={parcelData?.ref}
            parcelSection={parcelData?.section}
            parcelNumero={parcelData?.numero}
            height="100%"
          />
        ) : (
          /* Placeholder avant toute recherche — aucune requête réseau */
          <div className="flex flex-col items-center gap-4 text-gray-400 select-none w-full h-full justify-center bg-[#e8e4dc]">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-40">
              <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/><path d="M2 12h20"/>
            </svg>
            <p className="text-sm font-medium tracking-wide opacity-60">
              Saisissez une adresse pour afficher la carte
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
