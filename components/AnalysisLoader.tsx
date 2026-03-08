"use client";

import { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// AnalysisLoader — Animation de chargement par étapes (à la GoRenove)
//
// Les étapes sont purement cosmétiques : elles avancent indépendamment des
// vrais appels API (qui sont en parallèle côté serveur). Le but est de
// rassurer l'utilisateur pendant l'attente et de créer une perception de
// valeur ("le système analyse vraiment mon bien en profondeur").
// ═══════════════════════════════════════════════════════════════════════════════

const ETAPES = [
  { label: 'Géolocalisation du bien…',                    icon: '📍', dureeMs: 800  },
  { label: 'Identification de la parcelle cadastrale…',   icon: '🗺️', dureeMs: 600  },
  { label: 'Interrogation de Géorisques…',                icon: '🔍', dureeMs: 1200 },
  { label: 'Recherche des arrêtés CatNat…',               icon: '📋', dureeMs: 800  },
  { label: 'Analyse sismique et radon…',                  icon: '⚡', dureeMs: 600  },
  { label: 'Vérification des zones PPR…',                 icon: '🛡️', dureeMs: 700  },
  { label: 'Analyse des sols et installations classées…', icon: '🏭', dureeMs: 800  },
  { label: 'Interrogation de la BDNB…',                   icon: '🏠', dureeMs: 600  },
  { label: 'Compilation du pré-rapport…',                 icon: '✅', dureeMs: 500  },
];

interface AnalysisLoaderProps {
  isLoading: boolean;
}

export function AnalysisLoader({ isLoading }: AnalysisLoaderProps) {
  const [etapeCourante, setEtapeCourante] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setEtapeCourante(0);
      return;
    }

    // Avance automatiquement d'étape en étape
    if (etapeCourante < ETAPES.length - 1) {
      const timer = setTimeout(() => {
        setEtapeCourante((prev) => prev + 1);
      }, ETAPES[etapeCourante].dureeMs);

      return () => clearTimeout(timer);
    }
  }, [isLoading, etapeCourante]);

  if (!isLoading) return null;

  return (
    <div className="w-full max-w-lg mx-auto p-6 bg-white shadow-dsfr">
      {/* Barre de progression */}
      <div className="w-full h-2 bg-gray-200 mb-6">
        <div
          className="h-full bg-bleu-france transition-all duration-500 ease-out"
          style={{
            width: `${((etapeCourante + 1) / ETAPES.length) * 100}%`,
          }}
        />
      </div>

      {/* Liste des étapes */}
      <div className="space-y-3">
        {ETAPES.map((etape, index) => (
          <div
            key={index}
            className={`
              flex items-center gap-3 px-4 py-2 text-sm
              transition-all duration-300
              ${index < etapeCourante
                ? 'text-green-700 opacity-100'
                : index === etapeCourante
                  ? 'text-bleu-france font-semibold'
                  : 'text-gray-400 opacity-50'
              }
            `}
          >
            {/* Icône d'état */}
            <span className="text-lg w-6 text-center">
              {index < etapeCourante ? '✓' : etape.icon}
            </span>

            {/* Libellé */}
            <span>{etape.label}</span>

            {/* Spinner pour l'étape en cours */}
            {index === etapeCourante && (
              <svg
                className="animate-spin h-4 w-4 ml-auto text-bleu-france"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* Message de réassurance */}
      <p className="mt-6 text-xs text-gray-500 text-center">
        Analyse en cours — 14 bases de données de l&apos;État interrogées simultanément
      </p>
    </div>
  );
}
