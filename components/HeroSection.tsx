"use client";

import { useState } from "react";
import AddressSearch from "./AddressSearch";
import ReassuranceBlock from "./ReassuranceBlock";

interface MapCoords {
  lat: number;
  lng: number;
  label: string;
}

export default function HeroSection() {
  const [hasResults, setHasResults] = useState(false);
  const [mapCoords, setMapCoords] = useState<MapCoords | null>(null);

  // Construit l'URL OpenStreetMap embed avec marqueur centré sur l'adresse
  const mapSrc = mapCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.004},${mapCoords.lat - 0.003},${mapCoords.lng + 0.004},${mapCoords.lat + 0.003}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lng}`
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">

      {/* Colonne Gauche */}
      <div className="flex flex-col gap-8">
        <div>
          <span className="inline-block bg-green-100 text-green-800 font-bold px-3 py-1 text-sm mb-4 border border-green-300">
            Données Géorisques & Cadastre
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            Connaître les risques et obligations de votre bien.
          </h1>
          <p className="text-lg text-gray-700">
            Obtenez immédiatement votre État des Risques (ERP) conforme et chiffrez vos diagnostics obligatoires (DPE, Amiante) auprès de professionnels certifiés.
          </p>
        </div>

        {/* Carte */}
        <div className="aspect-video md:aspect-square border-4 border-white shadow-dsfr relative overflow-hidden shrink-0 bg-gray-100">
          {mapSrc ? (
            <>
              <iframe
                src={mapSrc}
                title={`Carte — ${mapCoords?.label}`}
                className="w-full h-full border-0"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 border-t border-gray-200 px-3 py-1.5 pointer-events-none">
                <p className="text-[10px] font-bold text-gray-700 truncate">📍 {mapCoords?.label}</p>
              </div>
            </>
          ) : (
            <>
              <img src="/carte.png" alt="Aperçu cartographique" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                <span className="bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-md border border-gray-300">
                  Aperçu cartographique
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bloc de rassurance — visible à gauche uniquement quand résultats affichés */}
        {hasResults && (
          <div className="transition-all duration-300">
            <ReassuranceBlock />
          </div>
        )}
      </div>

      {/* Colonne Droite */}
      <div className="flex flex-col gap-6 w-full z-10">

        {/* Zone de Saisie */}
        <div className="bg-white p-6 md:p-8 shadow-dsfr border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
            Rechercher un dossier immobilier
          </h2>
          <div className="relative z-20">
            <AddressSearch
              onResultsChange={setHasResults}
              onAddressSelect={setMapCoords}
            />
          </div>
        </div>

        {/* Bloc de rassurance — visible à droite par défaut, disparaît quand résultats */}
        {!hasResults && (
          <div className="transition-all duration-300">
            <ReassuranceBlock />
          </div>
        )}

      </div>
    </div>
  );
}
