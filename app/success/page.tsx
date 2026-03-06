"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const lat     = searchParams.get("lat");
  const lon     = searchParams.get("lon");
  const insee   = searchParams.get("insee");
  const city    = searchParams.get("city");
  const adresse = searchParams.get("adresse");

  const [status, setStatus] = useState<"verifying" | "downloading" | "done" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verifyAndDownload() {
      if (!sessionId) {
        setStatus("error");
        setErrorMsg("Identifiant de session manquant.");
        return;
      }

      try {
        // 1. Vérifier le paiement
        const verifyRes = await fetch(`/api/verify-payment?session_id=${sessionId}`);
        if (!verifyRes.ok) {
          const err = await verifyRes.json();
          setStatus("error");
          setErrorMsg(err.error || "Paiement non confirmé.");
          return;
        }
        const { paid, metadata } = await verifyRes.json();

        if (!paid) {
          setStatus("error");
          setErrorMsg("Le paiement n'a pas été validé. Veuillez réessayer.");
          return;
        }

        // 2. Récupérer les params PDF (depuis l'URL ou les métadonnées Stripe)
        const pdfLat    = lat     || metadata?.lat;
        const pdfLon    = lon     || metadata?.lon;
        const pdfInsee  = insee   || metadata?.insee;
        const pdfCity   = city    || metadata?.city || "";
        const pdfAdresse = adresse || metadata?.adresse;

        if (!pdfLat || !pdfLon || !pdfInsee || !pdfAdresse) {
          setStatus("error");
          setErrorMsg("Paramètres d'adresse manquants pour générer le PDF.");
          return;
        }

        setStatus("downloading");

        // 3. Déclencher le téléchargement du PDF
        const params = new URLSearchParams({
          lat:     pdfLat,
          lon:     pdfLon,
          insee:   pdfInsee,
          city:    pdfCity,
          adresse: pdfAdresse,
        });

        const pdfRes = await fetch(`/api/erp-pdf?${params.toString()}`);
        if (!pdfRes.ok) throw new Error("PDF indisponible");

        const blob = await pdfRes.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `ERP-${(pdfAdresse).replace(/[^a-z0-9]/gi, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStatus("done");

      } catch (error) {
        console.error("Erreur:", error);
        setStatus("error");
        setErrorMsg("Erreur lors de la génération du PDF. Contactez-nous.");
      }
    }

    verifyAndDownload();
  }, []);

  return (
    <div className="min-h-screen bg-fond-gris flex items-center justify-center px-4">
      {/* Liseré tricolore */}
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <div className="bg-white border border-gray-200 shadow-dsfr p-10 max-w-lg w-full text-center">

        {/* Logo */}
        <div className="mb-8">
          <img src="/logo.png" alt="Géodiag" className="h-12 w-auto mx-auto block bg-slate-200" />
        </div>

        {/* État : Vérification */}
        {status === "verifying" && (
          <>
            <div className="w-14 h-14 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin mx-auto mb-6"></div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Vérification du paiement…</h1>
            <p className="text-sm text-gray-500">Connexion sécurisée aux serveurs Stripe.</p>
          </>
        )}

        {/* État : Téléchargement */}
        {status === "downloading" && (
          <>
            <div className="text-5xl mb-6">📄</div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">Paiement confirmé !</h1>
            <p className="text-sm text-gray-600 mb-4">
              Génération de votre rapport ERP officiel en cours depuis les serveurs de <strong>Géorisques.gouv.fr</strong>…
            </p>
            <div className="w-10 h-10 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin mx-auto"></div>
          </>
        )}

        {/* État : Succès */}
        {status === "done" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Votre ERP est téléchargé !</h1>
            <p className="text-sm text-gray-600 mb-2">
              Le rapport officiel a été généré directement depuis <strong>Géorisques.gouv.fr</strong> et enregistré sur votre appareil.
            </p>
            {adresse && (
              <p className="text-xs font-mono bg-gray-100 border border-gray-200 px-3 py-2 mt-4 text-gray-700">
                {adresse}
              </p>
            )}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 text-left text-xs text-gray-700 leading-relaxed">
              <p className="font-bold text-bleu-france mb-1">📋 Rappel important</p>
              <p>Ce document est valable <strong>6 mois</strong>. Remettez-le à l'acquéreur ou au locataire avant la signature du compromis ou du bail.</p>
            </div>
            <a
              href="/"
              className="inline-block mt-8 bg-bleu-france text-white font-bold py-3 px-8 hover:bg-bleu-france-hover transition-colors text-sm"
            >
              ← Retour à l'accueil
            </a>
          </>
        )}

        {/* État : Erreur */}
        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-3">Une erreur est survenue</h1>
            <p className="text-sm text-rouge-marianne font-bold mb-4">{errorMsg}</p>
            <p className="text-sm text-gray-600 mb-6">
              Si votre paiement a bien été débité, contactez-nous à{" "}
              <a href="mailto:geodiag75@proton.me" className="text-bleu-france underline font-bold">
                geodiag75@proton.me
              </a>{" "}
              avec votre identifiant de session :
            </p>
            {sessionId && (
              <p className="text-xs font-mono bg-gray-100 border border-gray-200 px-3 py-2 text-gray-500 break-all">
                {sessionId}
              </p>
            )}
            <a
              href="/"
              className="inline-block mt-8 bg-gray-900 text-white font-bold py-3 px-8 hover:bg-gray-700 transition-colors text-sm"
            >
              ← Retour à l'accueil
            </a>
          </>
        )}

        <p className="text-[10px] text-gray-400 mt-8">
          Géodiag SaaS · Paiement sécurisé par Stripe · Document généré depuis l'Open Data de l'État
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-fond-gris flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
