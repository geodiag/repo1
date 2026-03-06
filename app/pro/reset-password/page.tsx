"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");
  const [ready,     setReady]     = useState(false);

  // Supabase injecte le token dans l'URL (#access_token=...)
  // La session est automatiquement récupérée par le client
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setError("Lien invalide ou expiré. Demandez un nouveau lien de réinitialisation.");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);

    const { error } = await supabaseBrowser.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("Erreur lors de la mise à jour. Réessayez ou demandez un nouveau lien.");
    } else {
      setDone(true);
      setTimeout(() => router.push("/pro/login"), 3000);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-fond-gris flex flex-col">
        <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3">Mot de passe mis à jour !</h2>
            <p className="text-sm text-gray-600 mb-6">Vous allez être redirigé vers la connexion…</p>
            <Link href="/pro/login" className="inline-block bg-bleu-france text-white font-bold py-3 px-8 text-sm hover:bg-bleu-france-hover transition">
              Se connecter →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fond-gris flex flex-col">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <div className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md">

          <div className="text-center mb-8">
            <Link href="/">
              <img src="/logo.png" alt="Géodiag" className="h-12 w-auto mx-auto bg-slate-200" />
            </Link>
            <p className="text-xs uppercase font-bold text-gray-500 mt-3 tracking-widest">Espace Professionnel</p>
            <h1 className="text-xl font-extrabold text-gray-900 mt-1">Nouveau mot de passe</h1>
          </div>

          {!ready ? (
            <div className="text-center py-6">
              {error ? (
                <div className="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-3 py-3 mb-4">{error}
                  <div className="mt-2">
                    <Link href="/pro/forgot-password" className="underline font-black">→ Nouveau lien</Link>
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 border-4 border-gray-200 border-t-bleu-france rounded-full animate-spin mx-auto"></div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-bleu-france focus:ring-1 focus:ring-bleu-france"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Confirmer le mot de passe</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-bleu-france focus:ring-1 focus:ring-bleu-france"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 font-bold bg-red-50 border border-red-200 px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bleu-france hover:bg-bleu-france-hover disabled:opacity-60 text-white font-bold py-3 text-sm transition"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Mise à jour…
                  </span>
                ) : "Enregistrer le nouveau mot de passe"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
