"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-fond-gris flex flex-col">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <div className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="bg-white border border-gray-200 shadow-dsfr p-8 w-full max-w-md text-center">

          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔑</span>
          </div>

          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Mot de passe oublié ?</h1>
          <p className="text-sm text-gray-600 mb-6">
            Contactez notre support par email et nous vous enverrons vos accès dans les plus brefs délais.
          </p>

          <a
            href="mailto:geodiag75@proton.me?subject=Réinitialisation mot de passe espace pro"
            className="block w-full text-center bg-bleu-france text-white font-bold py-3 px-8 text-sm hover:bg-bleu-france-hover transition mb-4"
          >
            📧 Contacter le support
          </a>

          <p className="text-xs text-gray-400">
            <Link href="/pro/login" className="text-bleu-france font-bold hover:underline">
              ← Retour à la connexion
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
