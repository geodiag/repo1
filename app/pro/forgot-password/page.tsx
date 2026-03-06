"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "../../../lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/pro/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError("Impossible d'envoyer l'email. Vérifiez l'adresse ou réessayez.");
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-fond-gris flex flex-col">
        <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3">Email envoyé !</h2>
            <p className="text-sm text-gray-600 mb-2">
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Vérifiez également vos spams si vous ne voyez rien dans les 2 minutes.
            </p>
            <Link href="/pro/login" className="inline-block text-xs text-bleu-france font-bold hover:underline">
              ← Retour à la connexion
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
            <h1 className="text-xl font-extrabold text-gray-900 mt-1">Mot de passe oublié</h1>
            <p className="text-xs text-gray-500 mt-1">Nous vous enverrons un lien pour le réinitialiser.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Votre email professionnel</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@cabinet.fr"
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
                  Envoi…
                </span>
              ) : "Envoyer le lien de réinitialisation"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            <Link href="/pro/login" className="hover:underline text-bleu-france font-bold">← Retour à la connexion</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
