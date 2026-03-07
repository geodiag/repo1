"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase-browser";
import { CREDIT_PACKS } from "../../api/pro/create-credits-checkout/route";
import type { User } from "@supabase/supabase-js";

interface Lead {
  id: string;
  adresse: string;
  type_projet: string;
  type_bien: string;
  created_at: string;
  email?: string;
  telephone?: string;
}

interface UnlockedLead {
  id: string;
  email: string;
  telephone: string;
}

export default function ProDashboard() {
  const router  = useRouter();
  const [user,          setUser]          = useState<User | null>(null);
  const [leads,         setLeads]         = useState<Lead[]>([]);
  const [purchases,     setPurchases]     = useState<string[]>([]);
  const [unlockedData,  setUnlockedData]  = useState<Record<string, UnlockedLead>>({});
  const [credits,       setCredits]       = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [unlocking,     setUnlocking]     = useState<string | null>(null);
  const [buyingPack,    setBuyingPack]    = useState<string | null>(null);
  const [showRecharge,  setShowRecharge]  = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function extractCommune(adresse: string): string {
    const parts = adresse.split(",");
    return parts[parts.length - 1]?.trim() || adresse;
  }

  // Affiche la rue sans le numéro + la commune — ex: "Rue du Moulin Vert, Paris"
  function maskStreetNumber(adresse: string): string {
    const parts = adresse.split(",");
    const street = parts[0]?.replace(/^\d+[-\w]*\s+/, "").trim() || ""; // retire le numéro initial
    const commune = parts[parts.length - 1]?.trim() || "";
    if (parts.length > 2) return `${street}, ${commune}`;
    return street || commune;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { router.replace("/pro/login"); return; }
      setUser(session.user);

      const [leadsRes, purchasesRes, profileRes] = await Promise.all([
        supabaseBrowser.from("leads").select("id, adresse, type_projet, type_bien, created_at").order("created_at", { ascending: false }),
        supabaseBrowser.from("lead_purchases").select("lead_id").eq("pro_id", session.user.id),
        supabaseBrowser.from("pro_profiles").select("credits, company").eq("id", session.user.id).single(),
      ]);

      setLeads(leadsRes.data || []);
      setPurchases((purchasesRes.data || []).map((p: { lead_id: string }) => p.lead_id));
      setCredits(profileRes.data?.credits || 0);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleUnlockWithCredit(lead: Lead) {
    if (!user) return;
    setUnlocking(lead.id);

    const res = await fetch("/api/pro/use-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: lead.id, proId: user.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 402) {
        showToast("Crédits insuffisants — rechargez votre compte.", "error");
        setShowRecharge(true);
      } else {
        showToast(data.error || "Erreur lors du déverrouillage.", "error");
      }
      setUnlocking(null);
      return;
    }

    // Mettre à jour l'état local
    setPurchases(prev => [...prev, lead.id]);
    setUnlockedData(prev => ({ ...prev, [lead.id]: data.lead }));
    setCredits(data.creditsRemaining);
    showToast("Lead déverrouillé ✅");
    setUnlocking(null);
  }

  async function handleBuyPack(packId: string) {
    if (!user) return;
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/pro/create-credits-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, proId: user.id }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      showToast("Erreur lors de la redirection.", "error");
      setBuyingPack(null);
    }
  }

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.push("/pro/login");
  }

  if (loading) return (
    <div className="min-h-screen bg-fond-gris flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin"></div>
    </div>
  );

  const unlockedCount = purchases.length;
  const newLeads      = leads.filter(l => !purchases.includes(l.id)).length;
  const creditColor   = credits === 0 ? "text-red-600" : credits <= 3 ? "text-orange-500" : "text-green-600";

  return (
    <div className="min-h-screen bg-fond-gris flex flex-col">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 text-sm font-bold shadow-lg border ${
          toast.type === "success"
            ? "bg-green-50 border-green-300 text-green-800"
            : "bg-red-50 border-red-300 text-red-700"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 mt-1 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Géodiag" className="h-9 w-auto bg-slate-200" />
            <div className="hidden sm:block border-l border-gray-200 pl-3">
              <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Espace Pro</p>
              <p className="text-xs font-bold text-gray-800 truncate max-w-[180px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Badge crédits */}
            <button
              onClick={() => setShowRecharge(v => !v)}
              style={{
                background: credits === 0
                  ? "linear-gradient(135deg, #7f1d1d, #dc2626)"
                  : credits <= 3
                  ? "linear-gradient(135deg, #78350f, #f59e0b)"
                  : "linear-gradient(135deg, #92400e, #d97706)",
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
            >
              <span className="text-base leading-none">🪙</span>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-white font-black text-sm leading-none">
                  {credits} <span className="font-bold text-xs opacity-80">cr.</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {credits === 0 ? "Épuisés" : credits <= 3 ? "Faible" : "Recharger"}
                </span>
              </div>
              <span className="hidden sm:flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                +
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="text-[10px] text-gray-400 font-bold hover:text-gray-700 transition px-2 py-1.5 border border-gray-200 rounded-lg"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 w-full">

        {/* Panneau Recharge */}
        {showRecharge && (
          <div className="mb-8 overflow-hidden rounded-2xl shadow-xl border border-indigo-100">
            {/* Header dégradé */}
            <div style={{ background: "linear-gradient(90deg, #003189 0%, #1a56db 100%)" }} className="px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs uppercase font-black tracking-widest mb-1">Recharger</p>
                <h2 className="text-white text-xl font-extrabold">Achetez des crédits</h2>
                <p className="text-blue-200 text-xs mt-1">1 crédit = 1 lead déverrouillé · Sans date d'expiration</p>
              </div>
              <button
                onClick={() => setShowRecharge(false)}
                className="text-white/50 hover:text-white text-2xl font-light transition leading-none"
              >✕</button>
            </div>

            {/* Cards packs */}
            <div className="bg-gradient-to-b from-slate-50 to-white p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CREDIT_PACKS.map((pack) => {
                  const isPro      = pack.id === "pro";
                  const isDecouverte = pack.id === "decouverte";
                  return (
                    <div
                      key={pack.id}
                      className={`relative flex flex-col rounded-xl border-2 p-4 transition-all ${
                        isPro
                          ? "border-bleu-france shadow-lg shadow-blue-100 bg-white"
                          : isDecouverte
                          ? "border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                      }`}
                    >
                      {/* Badges */}
                      {isPro && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="bg-gradient-to-r from-bleu-france to-[#1a56db] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow">
                            ⭐ Populaire
                          </span>
                        </div>
                      )}
                      {isDecouverte && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="bg-gray-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                            🧪 Essai
                          </span>
                        </div>
                      )}

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-3 ${isPro ? "bg-blue-100" : "bg-gray-100"}`}>
                        <span className="text-base">🪙</span>
                      </div>

                      <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isPro ? "text-bleu-france" : "text-gray-400"}`}>
                        {pack.label}
                      </p>

                      <div className="flex items-end gap-1 mb-1">
                        <span className="text-4xl font-black text-gray-900 leading-none">{pack.credits}</span>
                        <span className="text-gray-400 text-xs font-bold pb-1">cr.</span>
                      </div>

                      <p className="text-xl font-extrabold text-gray-900 mt-1">{pack.priceDisplay}</p>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 mb-3 self-start ${isPro ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {pack.perLead}
                      </span>

                      <div className="mt-auto space-y-1.5 text-[10px] text-gray-500 mb-4">
                        <div className="flex items-center gap-1"><span className="text-green-500">✓</span> Instantané</div>
                        <div className="flex items-center gap-1"><span className="text-green-500">✓</span> Sans expiration</div>
                        {isDecouverte && <div className="flex items-center gap-1"><span className="text-gray-400">·</span> <span className="text-gray-400 italic">Idéal pour tester</span></div>}
                        {isPro && <div className="flex items-center gap-1"><span className="text-green-500">✓</span> Meilleur prix</div>}
                      </div>

                      <button
                        onClick={() => handleBuyPack(pack.id)}
                        disabled={buyingPack === pack.id}
                        style={isPro ? { background: "linear-gradient(90deg, #003189 0%, #1a56db 100%)" } : {}}
                        className={`w-full font-bold py-2.5 text-xs rounded-lg transition-all disabled:opacity-60 ${
                          isPro
                            ? "text-white hover:shadow-lg hover:shadow-blue-200"
                            : isDecouverte
                            ? "bg-gray-700 text-white hover:bg-gray-600"
                            : "bg-gray-900 text-white hover:bg-gray-700"
                        }`}
                      >
                        {buyingPack === pack.id ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            …
                          </span>
                        ) : `Acheter — ${pack.priceDisplay}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-xs text-gray-400 mt-5 flex items-center justify-center gap-2">
                <span>🔒</span> Paiement sécurisé par Stripe · Carte bancaire · Aucun abonnement
              </p>
            </div>
          </div>
        )}

        {/* Stats — barre mobile / cards desktop */}
        {/* MOBILE */}
        <div
          className="sm:hidden rounded-xl overflow-hidden shadow-md mb-4"
          style={{ background: "linear-gradient(135deg, #003189 0%, #1a56db 100%)" }}
        >
          <div className="grid grid-cols-4 divide-x divide-white/10">
            {[
              { label: "Leads",     value: leads.length,  icon: "📋", clickable: false },
              { label: "Nouveaux",  value: newLeads,      icon: "🆕", clickable: false },
              { label: "Déverr.",   value: unlockedCount, icon: "🔓", clickable: false },
              { label: "Crédits",   value: credits,       icon: "🪙", clickable: true  },
            ].map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={stat.clickable ? () => setShowRecharge(v => !v) : undefined}
                style={stat.clickable ? { background: "linear-gradient(135deg, #92400e 0%, #d97706 100%)" } : {}}
                className={`flex flex-col items-center justify-center py-3 px-1 gap-0.5 w-full ${stat.clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="text-base leading-none" style={{ opacity: 0.75 }}>{stat.icon}</span>
                <span className="text-xl font-black text-white leading-none mt-0.5">{stat.value}</span>
                <span className="text-[8px] uppercase font-black tracking-wide leading-tight" style={{ color: "rgba(255,255,255,0.55)" }}>{stat.label}</span>
                {stat.clickable && (
                  <span className="text-[8px] font-bold mt-0.5" style={{ color: "#fcd34d" }}>+ Recharger</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* DESKTOP */}
        <div className="hidden sm:grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Leads dispo",   value: leads.length,  icon: "📋", clickable: false },
            { label: "Nouveaux",      value: newLeads,      icon: "🆕", clickable: false },
            { label: "Déverrouillés", value: unlockedCount, icon: "🔓", clickable: false },
            { label: "Crédits",       value: credits,       icon: "🪙", clickable: true  },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={stat.clickable ? () => setShowRecharge(v => !v) : undefined}
              style={{
                background: stat.clickable
                  ? "linear-gradient(135deg, #92400e 0%, #d97706 100%)"
                  : "linear-gradient(135deg, #003189 0%, #1a56db 100%)"
              }}
              className={`rounded-2xl overflow-hidden shadow-lg transition-all ${
                stat.clickable ? "cursor-pointer hover:shadow-xl hover:scale-[1.02]" : ""
              }`}
            >
              <div className="px-5 py-5 flex flex-col gap-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs uppercase font-black tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {stat.label}
                  </p>
                  <span className="text-xl" style={{ opacity: 0.6 }}>{stat.icon}</span>
                </div>
                <p className="text-5xl font-black text-white leading-none">{stat.value}</p>
                {stat.clickable && (
                  <p className="text-xs font-bold mt-2" style={{ color: "#93c5fd" }}>+ Recharger →</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Alerte crédits épuisés */}
        {credits === 0 && (
          <div className="mb-6 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-extrabold text-orange-900">Crédits épuisés</p>
                <p className="text-xs text-orange-700 mt-0.5">Rechargez pour débloquer de nouveaux leads instantanément.</p>
              </div>
            </div>
            <button
              onClick={() => setShowRecharge(true)}
              className="shrink-0 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-xs py-2 px-4 rounded-lg hover:shadow-lg transition-all"
            >
              Recharger →
            </button>
          </div>
        )}

        {/* Tableau des leads */}
        <div className="rounded-2xl overflow-hidden shadow-xl border border-indigo-100">
          <div style={{ background: "linear-gradient(90deg, #003189 0%, #1a56db 100%)" }} className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase font-black tracking-widest mb-1">Tableau de bord</p>
              <h2 className="text-white text-xl font-extrabold">Leads qualifiés</h2>
              <p className="text-blue-200 text-xs mt-1">Coordonnées masquées · 1 crédit par lead déverrouillé</p>
            </div>
            <button
              onClick={() => setShowRecharge(v => !v)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm px-4 py-2 rounded-full transition-all"
            >
              <span>🪙</span>
              <span>{credits} crédit{credits !== 1 ? "s" : ""}</span>
              <span className="text-white/60 text-xs">· Recharger</span>
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-bold">Aucun lead disponible pour le moment.</p>
            </div>
          ) : (
            <>
              {/* ── MOBILE : cartes ── */}
              <div className="md:hidden bg-white divide-y divide-gray-100">
                {leads.map((lead) => {
                  const isUnlocked  = purchases.includes(lead.id);
                  const revealedData = unlockedData[lead.id];
                  return (
                    <div key={lead.id} className={`p-4 ${isUnlocked ? "bg-green-50/30" : ""}`}>
                      {/* Ligne 1 : adresse + date */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">📍 {maskStreetNumber(lead.adresse)}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(lead.created_at)}</p>
                        </div>
                        {isUnlocked && (
                          <span className="shrink-0 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                            ✅ Déverrouillé
                          </span>
                        )}
                      </div>

                      {/* Ligne 2 : badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {lead.type_projet && (
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 uppercase rounded">
                            {lead.type_projet}
                          </span>
                        )}
                        {lead.type_bien && (
                          <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded">
                            {lead.type_bien}
                          </span>
                        )}
                      </div>

                      {/* Ligne 3 : contact ou masqué + bouton */}
                      <div className="flex items-center justify-between gap-3">
                        {isUnlocked ? (
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-gray-900">{revealedData?.email || "–"}</p>
                            <p className="text-gray-500">{revealedData?.telephone || "–"}</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="h-3 w-32 bg-gray-200 rounded-sm"></div>
                            <div className="h-3 w-20 bg-gray-200 rounded-sm"></div>
                          </div>
                        )}

                        {!isUnlocked && (
                          <button
                            onClick={() => handleUnlockWithCredit(lead)}
                            disabled={unlocking === lead.id}
                            style={{ background: "linear-gradient(90deg, #003189 0%, #1a56db 100%)" }}
                            className="shrink-0 inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-60 transition-all"
                          >
                            {unlocking === lead.id ? (
                              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Déverrouillage…</>
                            ) : (
                              <><span>🪙</span> 1 crédit</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── DESKTOP : tableau ── */}
              <div className="hidden md:block overflow-x-auto bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase font-black text-gray-500">
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Adresse</th>
                      <th className="text-left px-4 py-3">Projet</th>
                      <th className="text-left px-4 py-3">Bien</th>
                      <th className="text-left px-4 py-3">Contact</th>
                      <th className="text-right px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const isUnlocked  = purchases.includes(lead.id);
                      const revealedData = unlockedData[lead.id];
                      return (
                        <tr key={lead.id} className={`border-b border-gray-100 ${isUnlocked ? "bg-green-50/30" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">📍 {maskStreetNumber(lead.adresse)}</td>
                          <td className="px-4 py-3">
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 uppercase">
                              {lead.type_projet || "–"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{lead.type_bien || "–"}</td>
                          <td className="px-4 py-3">
                            {isUnlocked ? (
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-gray-900">{revealedData?.email || "–"}</p>
                                <p className="text-xs text-gray-600">{revealedData?.telephone || "–"}</p>
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="h-3 w-36 bg-gray-200 rounded-sm"></div>
                                <div className="h-3 w-24 bg-gray-200 rounded-sm"></div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isUnlocked ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                                ✅ Déverrouillé
                              </span>
                            ) : (
                              <button
                                onClick={() => handleUnlockWithCredit(lead)}
                                disabled={unlocking === lead.id}
                                style={{ background: "linear-gradient(90deg, #003189 0%, #1a56db 100%)" }}
                                className="inline-flex items-center gap-1.5 hover:shadow-md hover:shadow-blue-200 disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                              >
                                {unlocking === lead.id ? (
                                  <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Déverrouillage…</>
                                ) : (
                                  <><span>🪙</span> 1 crédit</>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Paiement sécurisé Stripe · Crédits sans date d'expiration · 1 crédit = 1 lead déverrouillé instantanément
        </p>
      </main>
    </div>
  );
}
