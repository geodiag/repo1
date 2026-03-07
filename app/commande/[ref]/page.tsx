"use client";

import { useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

// ─── Types ─────────────────────────────────────────────────────────────────
interface UserFormData {
  prenom:       string;
  nom:          string;
  email:        string;
  telephone:    string;
  profil:       "vendeur" | "acquereur" | "bailleur" | "locataire" | "";
  typeBien:     "appartement" | "maison" | "terrain" | "commerce" | "";
}

// ─── Contenu principal (client) ────────────────────────────────────────────
function CommandeContent() {
  const params      = useParams();
  const searchParams = useSearchParams();

  const ref     = decodeURIComponent((params.ref as string) || "");
  const adresse = searchParams.get("adresse") || "";
  const lat     = searchParams.get("lat")     || "";
  const lng     = searchParams.get("lng")     || "";
  const insee   = searchParams.get("insee")   || "";
  const city    = searchParams.get("city")    || "";

  const [form, setForm] = useState<UserFormData>({
    prenom: "", nom: "", email: "", telephone: "", profil: "", typeBien: "",
  });
  const [errors, setErrors]   = useState<Partial<UserFormData>>({});
  const [submitting, setSubmitting] = useState(false);

  // Profils disponibles (boutons radio stylés)
  const profils = [
    { key: "vendeur",    label: "Vendeur",    icon: "🏷️" },
    { key: "acquereur",  label: "Acquéreur",  icon: "🤝" },
    { key: "bailleur",   label: "Bailleur",   icon: "🏢" },
    { key: "locataire",  label: "Locataire",  icon: "🔑" },
  ] as const;

  const typesBien = [
    { key: "appartement", label: "Appartement" },
    { key: "maison",      label: "Maison" },
    { key: "terrain",     label: "Terrain" },
    { key: "commerce",    label: "Commerce" },
  ] as const;

  // ── Validation basique ──────────────────────────────────────────────────
  function validate(): boolean {
    const e: Partial<UserFormData> = {};
    if (!form.prenom.trim()) e.prenom = "Obligatoire";
    if (!form.nom.trim())    e.nom    = "Obligatoire";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email invalide";
    if (!form.profil)   e.profil   = "Sélectionnez votre profil" as UserFormData["profil"];
    if (!form.typeBien) e.typeBien = "Sélectionnez le type de bien" as UserFormData["typeBien"];
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Soumission ──────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    // Sauvegarder les infos utilisateur dans la session navigateur
    localStorage.setItem("geodiag_user", JSON.stringify({
      ...form,
      ref, adresse, lat, lng, insee, city,
    }));

    // Rediriger vers mon espace
    window.location.href = "/espace";
  }

  return (
    <div className="min-h-screen bg-fond-gris">
      {/* Liseré tricolore */}
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      {/* En-tête */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <a href="/">
            <Image src="/logo.png" alt="Géodiag" width={120} height={40} className="h-9 w-auto object-contain" />
          </a>
          <div className="flex-1"></div>
          {/* Indicateur d'étape */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-bold">
            <span className="w-6 h-6 bg-bleu-france text-white rounded-none flex items-center justify-center font-black text-xs">1</span>
            <span className="text-bleu-france">Analyse</span>
            <span className="text-gray-300 mx-1">─────</span>
            <span className="w-6 h-6 bg-gray-900 text-white rounded-none flex items-center justify-center font-black text-xs">2</span>
            <span className="text-gray-900">Vos informations</span>
            <span className="text-gray-300 mx-1">─────</span>
            <span className="w-6 h-6 bg-gray-200 text-gray-400 rounded-none flex items-center justify-center font-black text-xs">3</span>
            <span className="text-gray-400">Votre espace</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 md:py-14">

        {/* Bannière "dossier prêt" */}
        <div className="flex items-center gap-3 bg-green-50 border border-green-300 px-5 py-4 mb-8">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-extrabold text-green-800 text-sm">
              Votre dossier a été pré-analysé avec succès
            </p>
            <p className="text-xs text-green-700 mt-0.5 font-mono truncate">
              {adresse || ref}
            </p>
          </div>
        </div>

        {/* Titre section */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase text-gray-500 tracking-widest mb-2">
            Étape 2 sur 3
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight mb-3">
            Renseignez vos coordonnées
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Pour accéder à votre espace propriétaire et télécharger votre rapport ERP officiel,
            nous avons besoin de quelques informations.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white border border-gray-200 shadow-dsfr">

            {/* ── Section 1 : Identité ──────────────────────────────────── */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xs font-black uppercase text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-5 h-5 bg-bleu-france text-white flex items-center justify-center text-[10px] font-black">1</span>
                Votre identité
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Prénom */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Prénom <span className="text-rouge-marianne">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    placeholder="Jean"
                    className={`w-full border-2 ${errors.prenom ? "border-rouge-marianne" : "border-gray-300"} px-3 py-2.5 text-sm focus:outline-none focus:border-bleu-france bg-white transition-colors`}
                  />
                  {errors.prenom && <p className="text-xs text-rouge-marianne mt-1 font-bold">{errors.prenom}</p>}
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Nom <span className="text-rouge-marianne">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    placeholder="Dupont"
                    className={`w-full border-2 ${errors.nom ? "border-rouge-marianne" : "border-gray-300"} px-3 py-2.5 text-sm focus:outline-none focus:border-bleu-france bg-white transition-colors`}
                  />
                  {errors.nom && <p className="text-xs text-rouge-marianne mt-1 font-bold">{errors.nom}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Adresse email <span className="text-rouge-marianne">*</span>
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jean.dupont@email.fr"
                    className={`w-full border-2 ${errors.email ? "border-rouge-marianne" : "border-gray-300"} px-3 py-2.5 text-sm focus:outline-none focus:border-bleu-france bg-white transition-colors`}
                  />
                  {errors.email && <p className="text-xs text-rouge-marianne mt-1 font-bold">{errors.email}</p>}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">
                    Téléphone <span className="text-gray-400 font-normal normal-case">(facultatif)</span>
                  </label>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="06 00 00 00 00"
                    className="w-full border-2 border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-bleu-france bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2 : Profil ───────────────────────────────────── */}
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xs font-black uppercase text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-5 h-5 bg-bleu-france text-white flex items-center justify-center text-[10px] font-black">2</span>
                Vous êtes <span className="text-rouge-marianne">*</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profils.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, profil: key })}
                    className={`flex flex-col items-center justify-center gap-2 py-4 px-2 border-2 text-xs font-bold transition-all
                      ${form.profil === key
                        ? "border-bleu-france bg-bleu-france text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-bleu-france hover:text-bleu-france"
                      }`}
                  >
                    <span className="text-xl">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
              {errors.profil && <p className="text-xs text-rouge-marianne mt-2 font-bold">⚠️ {errors.profil}</p>}
            </div>

            {/* ── Section 3 : Type de bien ─────────────────────────────── */}
            <div className="p-6">
              <h2 className="text-xs font-black uppercase text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-5 h-5 bg-bleu-france text-white flex items-center justify-center text-[10px] font-black">3</span>
                Type de bien <span className="text-rouge-marianne">*</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {typesBien.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, typeBien: key })}
                    className={`py-3 px-2 border-2 text-xs font-bold transition-all
                      ${form.typeBien === key
                        ? "border-bleu-france bg-blue-50 text-bleu-france"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {errors.typeBien && <p className="text-xs text-rouge-marianne mt-2 font-bold">⚠️ {errors.typeBien}</p>}
            </div>
          </div>

          {/* CTA principal */}
          <div className="mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-bleu-france hover:bg-bleu-france-hover disabled:opacity-60 disabled:cursor-wait text-white font-extrabold py-4 px-8 text-base transition-colors flex items-center justify-center gap-3 shadow-dsfr"
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Création de votre espace…
                </>
              ) : (
                <>
                  Accéder à mon espace
                  <span className="text-lg" aria-hidden="true">→</span>
                </>
              )}
            </button>

            {/* Réassurance légale */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[10px] text-gray-500 font-bold uppercase tracking-wide">
              <div className="flex flex-col items-center gap-1">
                <span className="text-base">🔒</span>
                Données protégées
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-base">⚡</span>
                Accès immédiat
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-base">📋</span>
                Conforme RGPD
              </div>
            </div>
          </div>
        </form>

        {/* Récapitulatif discret */}
        <div className="mt-8 bg-white border border-gray-200 p-4">
          <p className="text-[10px] uppercase font-black text-gray-400 mb-2">Votre dossier</p>
          <p className="text-sm font-bold text-gray-700 truncate">{adresse || ref}</p>
          {ref && ref !== adresse && (
            <p className="text-xs font-mono text-gray-400 mt-0.5">Réf. cadastrale : {ref}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 font-bold uppercase">
              8 bases interrogées
            </span>
            <span className="text-[10px] bg-blue-50 text-bleu-france border border-blue-200 px-2 py-0.5 font-bold uppercase">
              ERP + ENSA inclus
            </span>
            <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 font-bold uppercase">
              Valable 6 mois
            </span>
          </div>
        </div>

      </main>

      <footer className="text-center py-8 text-[10px] text-gray-400">
        Géodiag SaaS · Document généré depuis l&apos;Open Data de l&apos;État · Conforme aux obligations réglementaires
      </footer>
    </div>
  );
}

// ─── Wrapper avec Suspense (requis pour useSearchParams) ───────────────────
export default function CommandePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-fond-gris flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
      </div>
    }>
      <CommandeContent />
    </Suspense>
  );
}
