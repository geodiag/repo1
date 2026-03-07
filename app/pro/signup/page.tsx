"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase-browser";

export default function ProSignupPage() {
  const router = useRouter();
  const [company,  setCompany]  = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  async function handleSignup(e: React.FormEvent) {
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

    const { data, error: signupError } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: { data: { company } },
    });

    if (signupError) {
      console.error("Supabase signUp error:", signupError.message, signupError);
      const msg = signupError.message;
      if (msg === "User already registered" || msg.includes("already registered")) {
        setError("Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.");
      } else if (msg.includes("rate limit") || msg.includes("email rate")) {
        setError("Trop de tentatives. Attendez quelques minutes avant de réessayer.");
      } else if (msg.includes("invalid") && msg.includes("email")) {
        setError("Adresse email invalide. Vérifiez le format.");
      } else if (msg.includes("Password") || msg.includes("password")) {
        setError("Mot de passe refusé : utilisez au moins 8 caractères avec des lettres et chiffres.");
      } else if (msg.includes("Signups not allowed")) {
        setError("Les inscriptions sont temporairement désactivées. Réessayez dans quelques instants.");
      } else {
        setError(`Erreur d'inscription : ${msg}`);
      }
      setLoading(false);
      return;
    }

    // Cas particulier : Supabase renvoie data.user null si l'email existe déjà (non confirmé)
    if (!data.user && !signupError) {
      setError("Un compte existe déjà avec cet email mais n'a pas encore été confirmé. Connectez-vous pour renvoyer l'email de confirmation.");
      setLoading(false);
      return;
    }

    // Créer le profil pro
    if (data.user) {
      await supabaseBrowser.from("pro_profiles").upsert({
        id: data.user.id,
        company,
      });

      // Notifier l'admin par email (non bloquant)
      fetch("/api/pro/notify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, email }),
      }).catch(() => {/* silencieux */});
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/pro/auth/callback` },
    });
  }

  if (success) {
    return (
      <div className="min-h-screen bg-fond-gris flex flex-col">
        <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
        <div className="flex-grow flex items-center justify-center px-4 py-16">
          <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Compte créé !</h2>
            <p className="text-sm text-gray-600 mb-6">
              Votre espace pro est prêt. Connectez-vous dès maintenant avec <strong>{email}</strong>.
            </p>
            <Link href="/pro/login" className="block w-full text-center bg-bleu-france text-white font-bold py-3 px-8 text-sm hover:bg-bleu-france-hover transition">
              Se connecter →
            </Link>
            <p className="text-center text-xs text-gray-400 mt-4">
              <Link href="/" className="hover:underline">← Retour au site</Link>
            </p>
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

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/">
              <img src="/logo.png" alt="Géodiag" className="h-12 w-auto mx-auto bg-slate-200" />
            </Link>
            <p className="text-xs uppercase font-bold text-gray-500 mt-3 tracking-widest">Espace Professionnel</p>
            <h1 className="text-xl font-extrabold text-gray-900 mt-1">Créer un compte</h1>
            <p className="text-xs text-gray-500 mt-1">Accédez aux leads qualifiés en immobilier</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 transition mb-5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            S'inscrire avec Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-bold">ou</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nom de l'entreprise</label>
              <input
                type="text"
                required
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Cabinet Dupont Diagnostics"
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-bleu-france focus:ring-1 focus:ring-bleu-france"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email professionnel</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@cabinet.fr"
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-bleu-france focus:ring-1 focus:ring-bleu-france"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Mot de passe</label>
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
                  Création…
                </span>
              ) : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Déjà inscrit ?{" "}
            <Link href="/pro/login" className="text-bleu-france font-bold hover:underline">
              Se connecter
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
