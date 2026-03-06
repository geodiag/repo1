"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase-browser";
import Link from "next/link";

function CreditsSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get("session_id");

  const [status,   setStatus]   = useState<"verifying" | "done" | "error">("verifying");
  const [credits,  setCredits]  = useState(0);
  const [added,    setAdded]    = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verify() {
      if (!sessionId) { setStatus("error"); setErrorMsg("Session manquante."); return; }

      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { setStatus("error"); setErrorMsg("Non connecté."); return; }

      const res = await fetch(`/api/pro/verify-credits-purchase?session_id=${sessionId}`);
      if (!res.ok) {
        const err = await res.json();
        setStatus("error");
        setErrorMsg(err.error || "Paiement non confirmé.");
        return;
      }
      const data = await res.json();
      setCredits(data.credits);
      setAdded(data.added || 0);
      setStatus("done");
    }
    verify();
  }, []);

  return (
    <div className="min-h-screen bg-fond-gris flex flex-col">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <div className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md text-center">

          {status === "verifying" && (
            <>
              <div className="w-12 h-12 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-bold text-gray-900">Validation du paiement…</p>
            </>
          )}

          {status === "done" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Crédits ajoutés !</h1>

              {/* Solde */}
              <div className="bg-gray-50 border border-gray-200 p-6 my-6">
                <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Crédits ajoutés</p>
                <p className="text-5xl font-black text-green-600 mb-1">+{added}</p>
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Solde total</p>
                  <p className="text-3xl font-black text-bleu-france">{credits} crédit{credits > 1 ? "s" : ""}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Chaque crédit déverrouille les coordonnées complètes d'un lead (email + téléphone).
              </p>

              <Link
                href="/pro/dashboard"
                className="inline-block w-full bg-bleu-france text-white font-bold py-3 text-sm hover:bg-bleu-france-hover transition"
              >
                Accéder au tableau de bord →
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">Erreur</h2>
              <p className="text-sm text-red-600 font-bold mb-6">{errorMsg}</p>
              <Link href="/pro/dashboard" className="inline-block bg-gray-900 text-white font-bold py-3 px-6 text-sm">
                Retour au tableau de bord
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreditsSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-fond-gris flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
      </div>
    }>
      <CreditsSuccessContent />
    </Suspense>
  );
}
