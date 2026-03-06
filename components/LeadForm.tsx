"use client";

import { useState } from "react";

// On passe l'adresse pré-validée en paramètre (Props)
export default function LeadForm({ adresseComplete }: { adresseComplete: string }) {
  const [formData, setFormData] = useState({
    type_projet: "vente",
    type_bien: "appartement",
    email: "",
    telephone: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Appel vers notre propre route API sécurisée
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, adresse: adresseComplete })
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        alert("Une erreur est survenue. Veuillez réessayer.");
      }
    } catch (error) {
      console.error("Erreur de soumission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mt-6 p-8 bg-green-50 border border-green-200 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Demande validée !</h3>
        <p className="text-green-700">Vos obligations sont identifiées. Nos experts certifiés de votre secteur vont vous appeler d'ici 20 minutes pour vos devis gratuits.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-white p-6 rounded-2xl shadow-lg border border-slate-100 animate-in fade-in zoom-in-95">
      <h3 className="text-xl font-bold text-slate-800 mb-4">Dernière étape pour vos devis DPE, amiante, plomb…</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Type de Projet */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Votre projet</label>
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.type_projet}
            onChange={(e) => setFormData({...formData, type_projet: e.target.value})}
          >
            <option value="vente">Vente</option>
            <option value="location">Location</option>
          </select>
        </div>

        {/* Type de Bien */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type de bien</label>
          <select 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.type_bien}
            onChange={(e) => setFormData({...formData, type_bien: e.target.value})}
          >
            <option value="appartement">Appartement</option>
            <option value="maison">Maison</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input 
            type="email" required
            placeholder="votre@email.com"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        {/* Téléphone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone (Pour les devis)</label>
          <input 
            type="tel" required
            placeholder="06 12 34 56 78"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setFormData({...formData, telephone: e.target.value})}
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
      >
        {isSubmitting ? "Envoi sécurisé..." : "Recevoir mes devis gratuitement ➔"}
      </button>
      <p className="text-xs text-center text-slate-400 mt-3">Vos données sont sécurisées et transmises uniquement à nos partenaires locaux certifiés.</p>
    </form>
  );
}