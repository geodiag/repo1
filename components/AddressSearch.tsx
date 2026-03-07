"use client";

import { useState, useEffect, useRef } from "react";
import LeadForm from "./LeadForm";

interface AddressFeature {
  properties: {
    id: string;
    label: string;
    city: string;
    context: string;
    citycode: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface DvfTransaction {
  date: string;
  prix: number;
  surface: number | null;
  type: string;
  prixM2: number | null;
}

interface ErpData {
  // Géorisques
  inondation: boolean;
  technologique: boolean;
  sismicite: string;
  potentielRadon: string;
  nbCatnat: number;
  // ADEME
  anneeConstruction: string;
  // Cadastre
  parcelleSurface: string;
  parcelleRef: string;
  parcelleSection: string;
  parcelleNumero: string;
  parcelleCommune: string;
  parcelleGeoJSON: object | null;
  // PLU
  zonePLU: string;
  codeZonePLU: string;
  libelleZone: string;
  // DVF
  transactionsRecentes: DvfTransaction[];
  prixMoyen: string;
  // ENSA
  ensaConcerne: boolean;
  ensaAerodromes: { nom: string; codePEB: string }[];
}

interface AddressSearchProps {
  onResultsChange?: (hasResults: boolean) => void;
  onAddressSelect?: (coords: { lat: number; lng: number; label: string } | null) => void;
  /** Remonte la géométrie GeoJSON + la référence cadastrale + section/numéro vers le parent (HeroSection) */
  onParcelData?: (data: { geoJSON: object | null; ref: string; section: string; numero: string } | null) => void;
}

export default function AddressSearch({ onResultsChange, onAddressSelect, onParcelData }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressFeature[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressFeature | null>(null);
  const [isErpLoading, setIsErpLoading] = useState(false);
  const [erpData, setErpData] = useState<ErpData | null>(null);
  const [erpError, setErpError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers les résultats dès qu'ils apparaissent
  useEffect(() => {
    if (erpData && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [erpData]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 3 && !selectedAddress) {
        setIsLoadingAddress(true);
        try {
          const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
          const data = await res.json();
          setResults(data.features || []);
        } catch (error) {
          console.error("Erreur API BAN:", error);
        } finally {
          setIsLoadingAddress(false);
        }
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query, selectedAddress]);

  const handleSelect = async (address: AddressFeature) => {
    setQuery(address.properties.label);
    setSelectedAddress(address);
    setResults([]);
    setIsErpLoading(true);
    setErpError(null);
    setErpData(null);

    const [lng, lat] = address.geometry.coordinates;
    onAddressSelect?.({ lat, lng, label: address.properties.label });
    const insee = address.properties.citycode;
    const label = address.properties.label;

    try {
      const res = await fetch(`/api/georisques?lat=${lat}&lng=${lng}&insee=${insee}&label=${encodeURIComponent(label)}`);
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      if (data.success) {
        setErpData(data.risques);
        onResultsChange?.(true);
        // Remonte la géométrie + section/numéro vers HeroSection pour la carte
        onParcelData?.({
          geoJSON : data.risques.parcelleGeoJSON ?? null,
          ref     : data.risques.parcelleRef ?? "–",
          section : data.risques.parcelleSection ?? "–",
          numero  : data.risques.parcelleNumero ?? "–",
        });
      }
    } catch (err) {
      setErpError("Service indisponible. Veuillez réessayer.");
    } finally {
      setIsErpLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row bg-white border-2 border-gray-900 focus-within:border-bleu-france focus-within:ring-2 focus-within:ring-blue-200 transition-all z-20 relative shadow-sm">
        <div className="flex-grow flex items-center px-4 py-4 sm:py-5">
          <span className="mr-3 text-2xl" aria-hidden="true">📍</span>
          <input
            type="text"
            className="w-full text-lg outline-none bg-transparent placeholder-gray-500 text-gray-900 font-medium"
            placeholder="Ex: 90 Rue du Moulin Vert, Paris..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedAddress(null);
              setErpData(null);
              onResultsChange?.(false);
              onAddressSelect?.(null);
              onParcelData?.(null);
            }}
          />
        </div>
        <button
          type="button"
          className="bg-bleu-france hover:bg-bleu-france-hover text-white px-8 py-4 sm:py-5 flex items-center justify-center font-bold text-lg transition-colors border-t border-gray-900 sm:border-t-0 sm:border-l"
        >
          {isLoadingAddress ? <span className="animate-pulse">⏳...</span> : <span>Rechercher</span>}
        </button>
      </div>

      {/* Suggestions d'adresse */}
      {results.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-300 shadow-dsfr overflow-hidden">
          {results.map((item) => (
            <li
              key={item.properties.id}
              onClick={() => handleSelect(item)}
              className="px-4 py-3 cursor-pointer hover:bg-gray-100 border-b border-gray-200 last:border-none"
            >
              <div className="font-bold text-gray-900">{item.properties.label}</div>
              <div className="text-sm text-gray-600">{item.properties.context}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Loader */}
      {isErpLoading && (
        <div className="mt-6 p-8 bg-white border border-gray-300 shadow-dsfr flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
          <p className="font-bold text-gray-900">Interrogation des bases de l'État en cours...</p>
          <p className="text-xs text-gray-500">Géorisques · ENSA/PEB · Cadastre · PLU · DVF · ADEME</p>
        </div>
      )}

      {/* Résultats enrichis */}
      {erpData && (
        <div ref={resultsRef} className="mt-6 bg-white border border-gray-300 shadow-dsfr overflow-hidden">

          {/* ── En-tête dossier ─────────────────────────────────────────── */}
          <div className="bg-fond-gris border-b border-gray-300 p-5">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">
              Dossier pré-analysé — 8 bases interrogées
            </p>
            <h3 className="text-xl font-extrabold text-bleu-france leading-tight mb-3">
              {selectedAddress?.properties.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {erpData.zonePLU !== "Non déterminée" && (
                <div className="inline-flex items-center gap-1 bg-white border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
                  <span>🗺️</span>
                  <span>Zone PLU : <span className="text-bleu-france">{erpData.zonePLU}</span></span>
                </div>
              )}
              {erpData.anneeConstruction && erpData.anneeConstruction !== "Non disponible" && (
                <div className="inline-flex items-center gap-1 bg-white border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
                  <span>🏗️</span>
                  <span>Construit en <span className="text-bleu-france">{erpData.anneeConstruction}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* ── Badge cadastral officiel ───────────────────────────────────── */}
          {(erpData.parcelleSection !== "–" || erpData.parcelleNumero !== "–") && (
            <div className="px-5 py-4 border-b border-gray-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-blue-50 border border-bleu-france/30">
                {/* Icône officielle */}
                <div className="shrink-0 w-10 h-10 bg-bleu-france flex items-center justify-center text-white text-lg">
                  🏛️
                </div>
                {/* Références */}
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-black text-gray-500 tracking-widest mb-1">
                    Parcelle cadastrale identifiée — IGN
                  </p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-gray-400 font-bold">Section</p>
                      <p className="text-xl font-black text-bleu-france font-mono leading-none">
                        {erpData.parcelleSection}
                      </p>
                    </div>
                    <div className="text-gray-300 text-xl font-thin">|</div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-gray-400 font-bold">Numéro</p>
                      <p className="text-xl font-black text-bleu-france font-mono leading-none">
                        {erpData.parcelleNumero}
                      </p>
                    </div>
                    {erpData.anneeConstruction && erpData.anneeConstruction !== "Non disponible" && (
                      <>
                        <div className="text-gray-300 text-xl font-thin">|</div>
                        <div className="text-center">
                          <p className="text-[9px] uppercase text-gray-400 font-bold">Construit en</p>
                          <p className="text-sm font-black text-gray-800 font-mono leading-none">
                            {erpData.anneeConstruction}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* Réf complète */}
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-[9px] uppercase text-gray-400 font-bold mb-1">Réf. complète</p>
                  <p className="text-xs font-mono bg-white border border-gray-300 px-2 py-1 text-gray-700">
                    {erpData.parcelleRef !== "–"
                      ? erpData.parcelleRef
                      : selectedAddress?.properties.id.split("_")[0]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Grille : Risques + Sources ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 border-b border-gray-200">
            <div className="lg:col-span-2 p-5 border-b lg:border-b-0 lg:border-r border-gray-200 space-y-3">
              <h4 className="text-xs font-black uppercase text-gray-900 pb-2 border-b border-gray-200">Risques naturels & technologiques</h4>
              <div className={`p-3 border-l-4 ${erpData.inondation ? 'border-l-rouge-marianne bg-red-50' : 'border-l-green-600 bg-gray-50'}`}>
                <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Risque Inondation</p>
                <span className={`text-xs font-bold ${erpData.inondation ? 'text-rouge-marianne' : 'text-green-700'}`}>
                  {erpData.inondation ? "⚠️ DÉTECTÉ" : "✅ AUCUN RISQUE MAJEUR"}
                </span>
              </div>
              <div className={`p-3 border-l-4 ${erpData.technologique ? 'border-l-rouge-marianne bg-red-50' : 'border-l-green-600 bg-gray-50'}`}>
                <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Risque Technologique</p>
                <span className={`text-xs font-bold ${erpData.technologique ? 'text-rouge-marianne' : 'text-green-700'}`}>
                  {erpData.technologique ? "⚠️ DÉTECTÉ" : "✅ AUCUN RISQUE MAJEUR"}
                </span>
              </div>
            </div>

            <div className="lg:col-span-3 p-5">
              <h4 className="text-xs font-black uppercase text-gray-900 mb-3 pb-2 border-b border-gray-200">Bases de données interrogées</h4>
              <ul className="text-sm space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Sinistres CATNAT : <strong>{erpData.nbCatnat} arrêtés</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Radon : <strong>{erpData.potentielRadon}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Sismicité : <strong>{erpData.sismicite}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Pollution des sols (BASIAS/SIS)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span>Cadastre IGN · PLU (GPU) · DVF</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={erpData.ensaConcerne ? "text-orange-500" : "text-green-600"}>
                    {erpData.ensaConcerne ? "⚠️" : "✅"}
                  </span>
                  <span>ENSA — Plan d'Exposition au Bruit (PEB) : <strong>{erpData.ensaConcerne ? "Concerné" : "Hors zone"}</strong></span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bloc PLU */}
          {(erpData.zonePLU !== "Non déterminée" || erpData.libelleZone) && (
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <h4 className="text-xs font-black uppercase text-gray-900 mb-3">🗺️ Plan Local d'Urbanisme (PLU)</h4>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="bg-white border border-bleu-france px-4 py-2 text-center shadow-sm">
                  <p className="text-[10px] uppercase text-gray-500 font-bold">Zone</p>
                  <p className="text-xl font-extrabold text-bleu-france">{erpData.zonePLU}</p>
                </div>
                {erpData.libelleZone && (
                  <p className="text-sm text-gray-700 flex-1">{erpData.libelleZone}</p>
                )}
              </div>
            </div>
          )}

          {/* Bloc ENSA – Nuisances Sonores Aériennes */}
          <div className="p-5 border-b border-gray-200 bg-sky-50">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-black uppercase text-gray-900">✈️ ENSA — Nuisances Sonores Aériennes</h4>
              <span className="text-[10px] bg-sky-200 text-sky-800 font-bold px-2 py-0.5 uppercase tracking-wide">Décret 2022</span>
            </div>
            {erpData.ensaConcerne ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-300 px-2 py-1">⚠️ Bien soumis au PEB</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">Ce bien est situé dans un Plan d'Exposition au Bruit (PEB). L'ENSA est obligatoire lors de toute vente ou location.</p>
                <div className="flex flex-wrap gap-2">
                  {erpData.ensaAerodromes.map((a, i) => (
                    <div key={i} className="bg-white border border-orange-200 px-3 py-1.5 text-xs">
                      <span className="font-bold text-gray-900">{a.nom}</span>
                      {a.codePEB !== "–" && <span className="ml-2 font-black text-orange-700">Zone {a.codePEB}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-300 px-2 py-1">✅ Hors zone PEB</span>
                <p className="text-xs text-gray-500">Aucun aérodrome avec PEB dans un rayon de 30 km.</p>
              </div>
            )}
          </div>

          {/* Bloc DVF transactions */}
          {erpData.transactionsRecentes.length > 0 && (
            <div className="p-5 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h4 className="text-xs font-black uppercase text-gray-900">💰 Transactions immobilières récentes (300 m)</h4>
                {erpData.prixMoyen !== "Non disponible" && (
                  <div className="bg-green-50 border border-green-300 px-3 py-1 text-xs font-bold text-green-800">
                    Prix moyen : {erpData.prixMoyen}
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-gray-700 border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-[10px] uppercase text-gray-500 font-black">
                      <th className="text-left px-3 py-2 border border-gray-200">Type</th>
                      <th className="text-left px-3 py-2 border border-gray-200">Date</th>
                      <th className="text-right px-3 py-2 border border-gray-200">Prix</th>
                      <th className="text-right px-3 py-2 border border-gray-200">Surface</th>
                      <th className="text-right px-3 py-2 border border-gray-200">€/m²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {erpData.transactionsRecentes.map((t, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 border border-gray-200 font-medium">{t.type}</td>
                        <td className="px-3 py-2 border border-gray-200 text-gray-500">{t.date}</td>
                        <td className="px-3 py-2 border border-gray-200 text-right font-bold text-gray-900">
                          {t.prix.toLocaleString('fr-FR')} €
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-right text-gray-500">
                          {t.surface ? `${t.surface} m²` : "–"}
                        </td>
                        <td className="px-3 py-2 border border-gray-200 text-right font-bold text-bleu-france">
                          {t.prixM2 ? `${t.prixM2.toLocaleString('fr-FR')} €` : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Source : Demandes de Valeurs Foncières (DVF) — Ministère de l'Économie</p>
            </div>
          )}

          {/* CTA — Étape suivante (sans affichage du prix) */}
          <div className="border-t-2 border-bleu-france p-6 bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-5">

              {/* Icône + texte descriptif */}
              <div className="flex gap-4 items-center flex-1">
                <div className="shrink-0 w-12 h-12 bg-bleu-france flex items-center justify-center text-2xl text-white">
                  📄
                </div>
                <div>
                  <p className="font-extrabold text-gray-900 text-sm mb-0.5">
                    Rapport ERP + ENSA Officiel prêt
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Données officielles de l'État · Valable 6 mois · Conforme notaire
                  </p>
                </div>
              </div>

              {/* Bouton principal — pas de prix affiché */}
              <button
                onClick={() => {
                  if (!selectedAddress || !erpData) return;
                  // Sauvegarder les données en session pour les retrouver dans l'espace
                  localStorage.setItem('geodiag_erp',     JSON.stringify(erpData));
                  localStorage.setItem('geodiag_address', JSON.stringify(selectedAddress));
                  // Construire la ref de la parcelle pour l'URL (ex: 33063000CW0162)
                  const ref = (erpData.parcelleRef && erpData.parcelleRef !== '–')
                    ? erpData.parcelleRef
                    : selectedAddress.properties.id;
                  const [lng, lat] = selectedAddress.geometry.coordinates;
                  const params = new URLSearchParams({
                    adresse: selectedAddress.properties.label,
                    lat:     String(lat),
                    lng:     String(lng),
                    insee:   selectedAddress.properties.citycode,
                    city:    selectedAddress.properties.city || '',
                  });
                  window.location.href = `/commande/${encodeURIComponent(ref)}?${params.toString()}`;
                }}
                className="shrink-0 bg-bleu-france hover:bg-bleu-france-hover text-white font-bold py-3 px-8 text-sm transition-colors flex items-center gap-2 shadow-dsfr"
              >
                Étape suivante
                <span aria-hidden="true" className="text-base">→</span>
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
              <span>🔒</span>
              <span>Démarche sécurisée · Document officiel conforme pour la vente ou la location</span>
            </p>
          </div>

        </div>
      )}

      {erpData && selectedAddress && (
        <LeadForm adresseComplete={selectedAddress.properties.label} />
      )}

      {erpError && <div className="mt-4 p-4 bg-red-50 text-rouge-marianne border border-red-200 font-bold">{erpError}</div>}
    </div>
  );
}
