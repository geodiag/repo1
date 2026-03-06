"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase-browser";
import Link from "next/link";

interface LeadData {
  adresse:     string;
  email:       string;
  telephone:   string;
  type_projet: string;
  type_bien:   string;
}

function LeadSuccessContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const sessionId    = searchParams.get("session_id");
  const leadId       = searchParams.get("lead_id");

  const [status,   setStatus]   = useState<"verifying" | "done" | "error">("verifying");
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verify() {
      if (!sessionId || !leadId) { setStatus("error"); setErrorMsg("Paramètres manquants."); return; }

      // 1. Vérifier session utilisateur
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.replace("/pro/login"); return; }

      // 2. Vérifier paiement Stripe
      const res = await fetch(`/api/pro/verify-lead-purchase?session_id=${sessionId}&lead_id=${leadId}`);
      if (!res.ok) {
        const err = await res.json();
        setStatus("error");
        setErrorMsg(err.error || "Paiement non confirmé.");
        return;
      }

      const { lead } = await res.json();
      setLeadData(lead);

      // 3. Enregistrer l'achat dans lead_purchases (idempotent grâce au UNIQUE)
      await supabaseBrowser.from("lead_purchases").upsert({
        pro_id:            session.user.id,
        lead_id:           leadId,
        stripe_session_id: sessionId,
      }, { onConflict: "pro_id,lead_id" });

      setStatus("done");
    }
    verify();
  }, []);

  return (
    <div className="min-h-screen bg-fond-gris flex flex-col">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <div className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-lg">

          {status === "verifying" && (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-bold text-gray-900">Vérification du paiement…</p>
            </div>
          )}

          {status === "done" && leadData && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">🔓</span>
                </div>
                <h1 className="text-xl font-extrabold text-gray-900">Lead déverrouillé !</h1>
                <p className="text-sm text-gray-500 mt-1">Paiement confirmé — coordonnées révélées</p>
              </div>

              {/* Coordonnées */}
              <div className="bg-gray-50 border border-gray-200 p-5 space-y-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Adresse du bien</p>
                  <p className="font-bold text-gray-900 text-sm">📍 {leadData.adresse}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Projet</p>
                    <p className="text-sm font-bold text-gray-800">{leadData.type_projet || "–"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-gray-500 mb-1">Type de bien</p>
                    <p className="text-sm font-bold text-gray-800">{leadData.type_bien || "–"}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <p className="text-[10px] uppercase font-black text-bleu-france mb-2">Contact client</p>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">✉️</span>
                    <a href={`mailto:${leadData.email}`} className="font-bold text-bleu-france hover:underline text-sm">
                      {leadData.email}
                    </a>
                  </div>
                  {leadData.telephone && (
                    <div className="flex items-center gap-3">
                      <span className="text-lg">📞</span>
                      <a href={`tel:${leadData.telephone}`} className="font-bold text-gray-900 hover:underline text-sm">
                        {leadData.telephone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/pro/dashboard"
                className="block text-center bg-bleu-france text-white font-bold py-3 text-sm hover:bg-bleu-france-hover transition"
              >
                ← Retour au tableau de bord
              </Link>
            </>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">Erreur</h2>
              <p className="text-sm text-red-600 font-bold mb-6">{errorMsg}</p>
              <Link href="/pro/dashboard" className="inline-block bg-gray-900 text-white font-bold py-3 px-6 text-sm">
                Retour au tableau de bord
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeadSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-fond-gris flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
      </div>
    }>
      <LeadSuccessContent />
    </Suspense>
  );
}
