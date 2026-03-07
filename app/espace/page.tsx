"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────
interface ErpData {
  inondation:         boolean;
  technologique:      boolean;
  sismicite:          string;
  potentielRadon:     string;
  nbCatnat:           number;
  anneeConstruction:  string;
  parcelleSurface:    string;
  parcelleRef:        string;
  parcelleSection:    string;
  parcelleNumero:     string;
  parcelleCommune:    string;
  parcelleGeoJSON:    object | null;
  zonePLU:            string;
  codeZonePLU:        string;
  libelleZone:        string;
  transactionsRecentes: { date: string; prix: number; surface: number | null; type: string; prixM2: number | null }[];
  prixMoyen:          string;
  ensaConcerne:       boolean;
  ensaAerodromes:     { nom: string; codePEB: string }[];
}

interface UserData {
  prenom:    string;
  nom:       string;
  email:     string;
  telephone: string;
  profil:    string;
  typeBien:  string;
  ref:       string;
  adresse:   string;
  lat:       string;
  lng:       string;
  insee:     string;
  city:      string;
}

// ─── Badge de risque ────────────────────────────────────────────────────────
function RiskBadge({ label, detected, detail }: { label: string; detected: boolean; detail?: string }) {
  return (
    <div className={`p-3 border-l-4 ${detected ? "border-l-rouge-marianne bg-red-50" : "border-l-green-600 bg-green-50"}`}>
      <p className="text-[10px] uppercase font-black text-gray-500 mb-1">{label}</p>
      <span className={`text-xs font-bold ${detected ? "text-rouge-marianne" : "text-green-700"}`}>
        {detected ? "⚠️ DÉTECTÉ" : "✅ AUCUN RISQUE MAJEUR"}
      </span>
      {detail && <p className="text-xs text-gray-500 mt-0.5">{detail}</p>}
    </div>
  );
}

// ─── Onglet 1 : Mon Rapport ────────────────────────────────────────────────
function TabMonRapport({ erp, user }: { erp: ErpData; user: UserData }) {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError]         = useState<string | null>(null);
  const [reportDownloaded, setReportDownloaded]   = useState(false);

  // Vérifier si le rapport a déjà été commandé (session en cours)
  useEffect(() => {
    const downloaded = sessionStorage.getItem("geodiag_rapport_done");
    if (downloaded === "1") setReportDownloaded(true);
  }, []);

  // Déclencher le paiement Stripe
  async function handlePaiement() {
    setIsCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/create-checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat:     user.lat,
          lon:     user.lng,
          insee:   user.insee,
          city:    user.city || "",
          adresse: user.adresse,
          // Paramètre de retour après paiement
          return_to: "espace",
        }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("URL de paiement manquante");
      }
    } catch {
      setCheckoutError("Impossible d'ouvrir la page de paiement. Réessayez.");
      setIsCheckoutLoading(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* Résumé risques — version condensée */}
      <div className="bg-white border border-gray-200 shadow-dsfr">
        <div className="bg-fond-gris border-b border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">
            Pré-analyse — 8 bases interrogées
          </p>
          <h3 className="text-lg font-extrabold text-bleu-france leading-tight">
            {user.adresse}
          </h3>
          {erp.parcelleRef && erp.parcelleRef !== "–" && (
            <p className="text-xs font-mono text-gray-500 mt-1">Réf. cadastrale : {erp.parcelleRef}</p>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <RiskBadge label="Risque Inondation"    detected={erp.inondation} />
          <RiskBadge label="Risque Technologique" detected={erp.technologique} />
          <RiskBadge label="Nuisances Sonores (ENSA)" detected={erp.ensaConcerne}
            detail={erp.ensaConcerne ? erp.ensaAerodromes.map(a => `${a.nom} · Zone ${a.codePEB}`).join(", ") : undefined}
          />
          <div className="p-3 bg-gray-50 border-l-4 border-l-gray-300">
            <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Sismicité</p>
            <p className="text-xs font-bold text-gray-700">{erp.sismicite}</p>
          </div>
          <div className="p-3 bg-gray-50 border-l-4 border-l-gray-300">
            <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Radon</p>
            <p className="text-xs font-bold text-gray-700">{erp.potentielRadon}</p>
          </div>
          <div className="p-3 bg-gray-50 border-l-4 border-l-gray-300">
            <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Sinistres CatNat</p>
            <p className="text-xs font-bold text-gray-700">{erp.nbCatnat} arrêtés</p>
          </div>
        </div>

        {/* Note pré-rapport */}
        <div className="border-t border-dashed border-gray-300 p-4 bg-amber-50">
          <p className="text-xs text-amber-800 font-bold flex items-center gap-2">
            <span>⚠️</span>
            Ce résumé est indicatif. Le rapport officiel PDF contient les formulaires CERFA ERP + ENSA
            complets, valables légalement pendant 6 mois.
          </p>
        </div>
      </div>

      {/* Bloc CTA Rapport officiel */}
      {reportDownloaded ? (
        <div className="bg-green-50 border border-green-300 p-6 text-center shadow-dsfr">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-lg font-extrabold text-green-800 mb-2">Rapport téléchargé !</h3>
          <p className="text-sm text-green-700">
            Votre ERP + ENSA officiel a été envoyé sur votre appareil. Valable 6 mois.
          </p>
          <p className="text-xs text-green-600 mt-3 font-bold">
            Remettez ce document au notaire avant la signature du compromis.
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-bleu-france shadow-dsfr overflow-hidden">
          {/* En-tête coloré */}
          <div className="bg-bleu-france px-6 py-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 flex items-center justify-center text-2xl">
              📄
            </div>
            <div className="text-white">
              <p className="font-extrabold text-lg leading-tight">Rapport ERP + ENSA Officiel</p>
              <p className="text-sm opacity-80">Formulaires CERFA · Données État · PDF immédiat</p>
            </div>
          </div>

          {/* Corps */}
          <div className="p-6">
            {/* Ce que contient le rapport */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {[
                { icon: "📋", label: "Formulaire CERFA ERP officiel", detail: "PPR, Sismicité, Radon, SIS, CatNat…" },
                { icon: "✈️", label: "Vérification ENSA complète",   detail: "Plan d'Exposition au Bruit (PEB)" },
                { icon: "🏛️", label: "Référence cadastrale IGN",     detail: `Section ${erp.parcelleSection} · N° ${erp.parcelleNumero}` },
                { icon: "✅", label: "Valeur légale 6 mois",         detail: "Accepté par tous les notaires" },
              ].map(({ icon, label, detail }) => (
                <div key={label} className="flex items-start gap-3 bg-gray-50 border border-gray-200 p-3">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{label}</p>
                    <p className="text-[10px] text-gray-500">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Prix + bouton */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-bleu-france/5 border border-bleu-france/20 p-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-3xl font-black text-gray-900 leading-none">9,90 €</p>
                <p className="text-xs text-gray-500 uppercase font-bold mt-0.5">TTC · Paiement unique</p>
              </div>
              <button
                disabled={isCheckoutLoading}
                onClick={handlePaiement}
                className="w-full sm:w-auto bg-bleu-france hover:bg-bleu-france-hover disabled:opacity-60 disabled:cursor-wait text-white font-extrabold py-3.5 px-8 transition-colors flex items-center justify-center gap-2 text-sm shadow-dsfr"
              >
                {isCheckoutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Redirection…
                  </>
                ) : (
                  <>
                    📥 Télécharger mon rapport
                  </>
                )}
              </button>
            </div>

            {checkoutError && (
              <p className="text-xs text-rouge-marianne mt-2 font-bold">⚠️ {checkoutError}</p>
            )}

            <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1.5">
              <span>🔒</span>
              <span>Paiement sécurisé par Stripe · Téléchargement instantané après validation</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet 2 : Mon Bien ───────────────────────────────────────────────────
function TabMonBien({ erp, user }: { erp: ErpData; user: UserData }) {
  return (
    <div className="space-y-5">
      {/* Fiche cadastrale */}
      <div className="bg-white border border-gray-200 shadow-dsfr">
        <div className="px-5 py-4 border-b border-gray-200 bg-fond-gris">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            🏛️ Données cadastrales officielles — IGN
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <InfoBox label="Section" value={erp.parcelleSection} highlight />
            <InfoBox label="Numéro"  value={erp.parcelleNumero}  highlight />
            <InfoBox label="Superficie" value={erp.parcelleSurface} />
            <InfoBox label="Commune"    value={erp.parcelleCommune || user.city || "–"} />
          </div>
          {erp.parcelleRef && erp.parcelleRef !== "–" && (
            <div className="bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Référence complète</p>
              <p className="font-mono text-sm font-bold text-gray-800">{erp.parcelleRef}</p>
            </div>
          )}
        </div>
      </div>

      {/* PLU */}
      {erp.zonePLU && erp.zonePLU !== "Non déterminée" && (
        <div className="bg-white border border-gray-200 shadow-dsfr">
          <div className="px-5 py-4 border-b border-gray-200 bg-fond-gris">
            <h3 className="text-sm font-extrabold text-gray-900">🗺️ Plan Local d'Urbanisme (PLU)</h3>
          </div>
          <div className="p-5 flex flex-wrap items-center gap-4">
            <div className="bg-bleu-france text-white px-6 py-4 text-center">
              <p className="text-[10px] uppercase font-bold opacity-80 mb-1">Zone</p>
              <p className="text-3xl font-black leading-none">{erp.zonePLU}</p>
            </div>
            {erp.libelleZone && (
              <p className="text-sm text-gray-700 flex-1 leading-relaxed">{erp.libelleZone}</p>
            )}
          </div>
        </div>
      )}

      {/* Caractéristiques */}
      <div className="bg-white border border-gray-200 shadow-dsfr">
        <div className="px-5 py-4 border-b border-gray-200 bg-fond-gris">
          <h3 className="text-sm font-extrabold text-gray-900">📊 Caractéristiques du bien</h3>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoBox label="Type" value={
            user.typeBien
              ? user.typeBien.charAt(0).toUpperCase() + user.typeBien.slice(1)
              : "–"
          } />
          <InfoBox label="Année de construction" value={erp.anneeConstruction || "Non disponible"} />
          <InfoBox label="Prix moyen (300m)"      value={erp.prixMoyen !== "Non disponible" ? erp.prixMoyen : "–"} />
        </div>
      </div>

      {/* DVF Transactions */}
      {erp.transactionsRecentes.length > 0 && (
        <div className="bg-white border border-gray-200 shadow-dsfr">
          <div className="px-5 py-4 border-b border-gray-200 bg-fond-gris flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-gray-900">💰 Transactions récentes (300 m)</h3>
            {erp.prixMoyen !== "Non disponible" && (
              <span className="text-xs bg-green-50 border border-green-300 text-green-800 font-bold px-3 py-1">
                Moy. : {erp.prixMoyen}
              </span>
            )}
          </div>
          <div className="p-5 overflow-x-auto">
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
                {erp.transactionsRecentes.map((t, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-medium">{t.type}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-500">{t.date}</td>
                    <td className="px-3 py-2 border border-gray-200 text-right font-bold text-gray-900">
                      {t.prix.toLocaleString("fr-FR")} €
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-right text-gray-500">
                      {t.surface ? `${t.surface} m²` : "–"}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-right font-bold text-bleu-france">
                      {t.prixM2 ? `${t.prixM2.toLocaleString("fr-FR")} €` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-gray-400 mt-2">
              Source : Demandes de Valeurs Foncières (DVF) — Ministère de l&apos;Économie
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Onglet 3 : Mes Diagnostics ────────────────────────────────────────────
function TabMesDiagnostics({ user }: { user: UserData }) {
  const [sentDiag, setSentDiag] = useState<string | null>(null);
  const [loadingDiag, setLoadingDiag] = useState<string | null>(null);

  const diagnostics = [
    {
      key:      "dpe",
      icon:     "🌡️",
      titre:    "Diagnostic de Performance Énergétique (DPE)",
      obligatoire: true,
      desc:     "Obligatoire pour toute vente ou location. Évalue la consommation énergétique et l'impact CO₂.",
      prix:     "100–250 €",
      delai:    "2–5 jours",
    },
    {
      key:      "amiante",
      icon:     "🧱",
      titre:    "Diagnostic Amiante",
      obligatoire: true,
      desc:     "Obligatoire pour les biens construits avant le 1er juillet 1997.",
      prix:     "80–200 €",
      delai:    "3–7 jours",
    },
    {
      key:      "plomb",
      icon:     "🔩",
      titre:    "Constat de Risque d'Exposition au Plomb (CREP)",
      obligatoire: true,
      desc:     "Obligatoire pour les biens construits avant le 1er janvier 1949.",
      prix:     "80–200 €",
      delai:    "3–7 jours",
    },
    {
      key:      "electrique",
      icon:     "⚡",
      titre:    "État de l'Installation Électrique",
      obligatoire: true,
      desc:     "Obligatoire si l'installation a plus de 15 ans.",
      prix:     "80–150 €",
      delai:    "1–3 jours",
    },
    {
      key:      "gaz",
      icon:     "🔥",
      titre:    "État de l'Installation au Gaz",
      obligatoire: true,
      desc:     "Obligatoire si l'installation a plus de 15 ans.",
      prix:     "80–150 €",
      delai:    "1–3 jours",
    },
    {
      key:      "termites",
      icon:     "🐛",
      titre:    "État Parasitaire (Termites)",
      obligatoire: false,
      desc:     "Obligatoire dans les zones délimitées par arrêté préfectoral.",
      prix:     "70–120 €",
      delai:    "1–3 jours",
    },
  ];

  async function handleDevis(diagKey: string) {
    setLoadingDiag(diagKey);
    // Appel à l'API leads pour enregistrer la demande de devis
    try {
      await fetch("/api/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adresse:   user.adresse,
          insee:     user.insee,
          email:     user.email,
          prenom:    user.prenom,
          nom:       user.nom,
          telephone: user.telephone,
          diagnostic: diagKey,
        }),
      });
    } catch {
      // Silently fail — the lead API is best-effort
    } finally {
      setLoadingDiag(null);
      setSentDiag(diagKey);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-bleu-france/30 p-4 text-sm text-bleu-france font-bold flex items-center gap-3">
        <span className="text-xl">💡</span>
        <span>
          Complétez votre dossier immobilier en un clic. Nous vous mettons en relation avec des
          diagnostiqueurs certifiés dans votre secteur.
        </span>
      </div>

      {diagnostics.map((diag) => (
        <div key={diag.key} className="bg-white border border-gray-200 shadow-dsfr overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
            {/* Icône + titre */}
            <div className="flex items-start gap-4 flex-1">
              <div className="shrink-0 w-10 h-10 bg-fond-gris border border-gray-200 flex items-center justify-center text-xl">
                {diag.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-extrabold text-gray-900">{diag.titre}</p>
                  {diag.obligatoire && (
                    <span className="text-[10px] bg-rouge-marianne/10 text-rouge-marianne border border-rouge-marianne/30 px-2 py-0.5 font-black uppercase">
                      Obligatoire
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{diag.desc}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-[10px] font-bold text-gray-500">💶 {diag.prix}</span>
                  <span className="text-[10px] font-bold text-gray-500">⏱️ {diag.delai}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 sm:text-right">
              {sentDiag === diag.key ? (
                <div className="text-center">
                  <p className="text-xs text-green-700 font-bold flex items-center gap-1">
                    <span>✅</span> Demande envoyée
                  </p>
                  <p className="text-[10px] text-gray-400">Un expert vous contactera sous 48h</p>
                </div>
              ) : (
                <button
                  disabled={loadingDiag === diag.key}
                  onClick={() => handleDevis(diag.key)}
                  className="bg-white hover:bg-fond-gris border-2 border-bleu-france text-bleu-france font-bold py-2 px-5 text-xs transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {loadingDiag === diag.key ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-bleu-france border-t-transparent rounded-full animate-spin"></span>
                      Envoi…
                    </span>
                  ) : "Demander un devis gratuit"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Onglet 4 : Historique ─────────────────────────────────────────────────
function TabHistorique({ user }: { user: UserData }) {
  // Vérifier si un rapport a été commandé
  const hasOrder = typeof window !== "undefined"
    && sessionStorage.getItem("geodiag_rapport_done") === "1";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 shadow-dsfr">
        <div className="px-5 py-4 border-b border-gray-200 bg-fond-gris">
          <h3 className="text-sm font-extrabold text-gray-900">📋 Mes commandes</h3>
        </div>

        {hasOrder ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase text-gray-500 font-black border-b border-gray-200">
                  <th className="text-left px-5 py-3">Document</th>
                  <th className="text-left px-5 py-3">Adresse</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-4 font-bold text-gray-900">ERP + ENSA Officiel</td>
                  <td className="px-5 py-4 text-gray-600 text-xs max-w-xs truncate">{user.adresse}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">
                    {new Date().toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 font-bold px-2 py-0.5 uppercase">
                      ✅ Téléchargé
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4 opacity-30">📋</div>
            <p className="text-sm font-bold text-gray-500 mb-1">Aucune commande pour le moment</p>
            <p className="text-xs text-gray-400">
              Votre historique de commandes apparaîtra ici après votre premier achat.
            </p>
          </div>
        )}
      </div>

      {/* Profil utilisateur */}
      <div className="bg-white border border-gray-200 shadow-dsfr">
        <div className="px-5 py-4 border-b border-gray-200 bg-fond-gris">
          <h3 className="text-sm font-extrabold text-gray-900">👤 Votre profil</h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoBox label="Nom"       value={`${user.prenom} ${user.nom}`} />
          <InfoBox label="Email"     value={user.email} />
          {user.telephone && <InfoBox label="Téléphone" value={user.telephone} />}
          {user.profil   && <InfoBox label="Profil"     value={user.profil.charAt(0).toUpperCase() + user.profil.slice(1)} />}
          {user.typeBien && <InfoBox label="Type de bien" value={user.typeBien.charAt(0).toUpperCase() + user.typeBien.slice(1)} />}
        </div>
      </div>
    </div>
  );
}

// ─── Composant InfoBox réutilisable ────────────────────────────────────────
function InfoBox({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 border border-gray-200 p-3">
      <p className="text-[10px] uppercase font-black text-gray-500 mb-1">{label}</p>
      <p className={`font-bold ${highlight ? "text-xl text-bleu-france font-mono" : "text-sm text-gray-900"}`}>
        {value || "–"}
      </p>
    </div>
  );
}

// ─── Page principale Espace ────────────────────────────────────────────────
const TABS = [
  { key: "rapport",     label: "Mon Rapport",     icon: "📄" },
  { key: "bien",        label: "Mon Bien",         icon: "🏠" },
  { key: "diagnostics", label: "Mes Diagnostics",  icon: "🔧" },
  { key: "historique",  label: "Historique",        icon: "📋" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function EspacePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("rapport");
  const [erpData,   setErpData]   = useState<ErpData | null>(null);
  const [userData,  setUserData]  = useState<UserData | null>(null);
  const [loading,   setLoading]   = useState(true);

  // Lire les données de session au montage
  useEffect(() => {
    try {
      const erp  = sessionStorage.getItem("geodiag_erp");
      const user = sessionStorage.getItem("geodiag_user");
      if (erp)  setErpData(JSON.parse(erp));
      if (user) setUserData(JSON.parse(user));
    } catch {
      // Session corrompue ou inexistante — on laisse loading=true pour afficher l'état vide
    } finally {
      setLoading(false);
    }
  }, []);

  // Vérifier si on revient de Stripe (paramètre return_to=espace dans l'URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("session_id")) {
      // On vient de valider le paiement — marquer le rapport comme téléchargé
      sessionStorage.setItem("geodiag_rapport_done", "1");
      // Nettoyer l'URL
      window.history.replaceState({}, "", "/espace");
    }
  }, []);

  // ── État de chargement ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-fond-gris flex items-center justify-center">
        <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
        <div className="w-12 h-12 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
      </div>
    );
  }

  // ── Session expirée / données manquantes ────────────────────────────────
  if (!erpData || !userData) {
    return (
      <div className="min-h-screen bg-fond-gris flex items-center justify-center px-4">
        <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
        <div className="bg-white border border-gray-200 shadow-dsfr p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-5">🔒</div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-3">Session expirée</h1>
          <p className="text-sm text-gray-600 mb-6">
            Votre session a expiré ou les données sont introuvables. Veuillez effectuer une nouvelle
            recherche pour accéder à votre espace.
          </p>
          <a
            href="/"
            className="inline-block bg-bleu-france text-white font-bold py-3 px-8 hover:bg-bleu-france-hover transition-colors text-sm"
          >
            ← Nouvelle recherche
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond-gris">
      {/* Liseré tricolore */}
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      {/* ── En-tête ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 py-3">
            <a href="/">
              <Image src="/logo.png" alt="Géodiag" width={120} height={40} className="h-8 w-auto object-contain" />
            </a>
            <div className="flex-1"></div>
            {/* Identité utilisateur */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="w-8 h-8 bg-bleu-france text-white flex items-center justify-center font-black text-sm">
                {userData.prenom.charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-xs font-extrabold text-gray-900 leading-none">
                  {userData.prenom} {userData.nom}
                </p>
                <p className="text-[10px] text-gray-500">{userData.email}</p>
              </div>
            </div>
            <a
              href="/"
              className="text-[10px] font-bold text-gray-500 hover:text-bleu-france transition-colors uppercase tracking-wide"
            >
              Nouvelle recherche
            </a>
          </div>
        </div>
      </header>

      {/* ── Bandeau adresse ────────────────────────────────────────────── */}
      <div className="bg-bleu-france text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] uppercase font-bold opacity-70 mb-0.5">Votre dossier</p>
              <p className="font-extrabold text-base leading-tight">{userData.adresse}</p>
            </div>
            {erpData.parcelleRef && erpData.parcelleRef !== "–" && (
              <div className="bg-white/10 border border-white/20 px-3 py-2 text-center shrink-0">
                <p className="text-[9px] uppercase font-bold opacity-70">Référence cadastrale</p>
                <p className="font-mono text-xs font-bold">{erpData.parcelleRef}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Navigation par onglets ──────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors
                  ${activeTab === key
                    ? "border-b-bleu-france text-bleu-france"
                    : "border-b-transparent text-gray-500 hover:text-gray-800 hover:border-b-gray-300"
                  }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Contenu des onglets ─────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "rapport"     && <TabMonRapport     erp={erpData} user={userData} />}
        {activeTab === "bien"        && <TabMonBien        erp={erpData} user={userData} />}
        {activeTab === "diagnostics" && <TabMesDiagnostics user={userData} />}
        {activeTab === "historique"  && <TabHistorique     user={userData} />}
      </main>

      <footer className="text-center py-8 text-[10px] text-gray-400 border-t border-gray-200 mt-8">
        Géodiag SaaS · Données issues de l&apos;Open Data de l&apos;État · Conforme aux obligations réglementaires
      </footer>
    </div>
  );
}
