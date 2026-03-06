"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase-browser";

export default function ProLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [errorType, setErrorType] = useState<"" | "unconfirmed" | "credentials" | "other">("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone,    setResendDone]    = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorType("");
    setResendDone(false);

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === "Email not confirmed") {
        setErrorType("unconfirmed");
        setError("Votre email n'a pas encore été confirmé. Vérifiez votre boîte mail (y compris les spams).");
      } else if (
        error.message === "Invalid login credentials" ||
        error.message === "invalid_credentials"
      ) {
        setErrorType("credentials");
        setError("Email ou mot de passe incorrect. Vérifiez vos informations ou réinitialisez votre mot de passe.");
      } else {
        setErrorType("other");
        setError("Une erreur est survenue. Réessayez dans quelques instants.");
      }
      setLoading(false);
    } else {
      router.push("/pro/dashboard");
    }
  }

  async function handleResendConfirmation() {
    if (!email) {
      setError("Saisissez votre email ci-dessus puis cliquez sur Renvoyer.");
      return;
    }
    setResendLoading(true);
    const { error } = await supabaseBrowser.auth.resend({ type: "signup", email });
    setResendLoading(false);
    if (!error) {
      setResendDone(true);
    } else {
      setError("Impossible de renvoyer l'email. Réessayez dans quelques minutes.");
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/pro/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-fond-gris flex flex-col">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <div className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/">
              <img src="/logo.png" alt="Géodiag" className="h-12 w-auto mx-auto bg-slate-200" />
            </Link>
            <p className="text-xs uppercase font-bold text-gray-500 mt-3 tracking-widest">Espace Professionnel</p>
            <h1 className="text-xl font-extrabold text-gray-900 mt-1">Connexion</h1>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 transition mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-bold">ou</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Formulaire email */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email professionnel</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setResendDone(false); }}
                placeholder="vous@cabinet.fr"
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-bleu-france focus:ring-1 focus:ring-bleu-france"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Mot de passe</label>
                <Link href="/pro/forgot-password" className="text-[11px] text-bleu-france hover:underline font-semibold">
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-bleu-france focus:ring-1 focus:ring-bleu-france"
              />
            </div>

            {/* Bloc erreur */}
            {error && (
              <div className={`text-xs font-bold px-3 py-3 border rounded-sm ${
                errorType === "unconfirmed"
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <p>{error}</p>

                {/* Email non confirmé → bouton renvoyer */}
                {errorType === "unconfirmed" && (
                  <div className="mt-2">
                    {resendDone ? (
                      <p className="text-green-700 font-bold">✅ Email renvoyé ! Vérifiez votre boîte (et les spams).</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="mt-1 text-[11px] font-black underline text-amber-700 hover:text-amber-900 disabled:opacity-60"
                      >
                        {resendLoading ? "Envoi en cours…" : "→ Renvoyer l'email de confirmation"}
                      </button>
                    )}
                  </div>
                )}

                {/* Mauvais mot de passe → lien reset */}
                {errorType === "credentials" && (
                  <p className="mt-1 text-[11px]">
                    <Link href="/pro/forgot-password" className="underline font-black text-red-700 hover:text-red-900">
                      → Réinitialiser mon mot de passe
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-bleu-france hover:bg-bleu-france-hover disabled:opacity-60 text-white font-bold py-3 text-sm transition"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Connexion…
                </span>
              ) : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Pas encore de compte ?{" "}
            <Link href="/pro/signup" className="text-bleu-france font-bold hover:underline">
              Créer un compte pro
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-2">
            <Link href="/" className="hover:underline">← Retour au site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
