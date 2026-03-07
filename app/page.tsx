import HeroSection from '../components/HeroSection';
import Header from '../components/Header';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-fond-gris">
      {/* Liseré tricolore Gouvernemental */}
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>

      <Header />

      {/* Main Content — full width pour le split-panel Hero */}
      <main className="flex-grow w-full">
        <HeroSection />
      </main>

      {/* Section FAQ / Conseils clients */}
      <section className="bg-white border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4">

          <div className="text-center mb-12">
            <span className="inline-block bg-blue-50 text-bleu-france font-bold px-3 py-1 text-xs uppercase tracking-widest border border-blue-200 mb-4">
              Ce que vous devez savoir
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900">
              ERP + ENSA : les vraies questions que vous vous posez
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Q1 */}
            <div className="border border-gray-200 p-6 hover:border-bleu-france hover:shadow-sm transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">⚖️</span>
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  Est-ce vraiment obligatoire pour moi ?
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Oui, sans exception. Tout propriétaire vendeur ou bailleur est légalement tenu de remettre un ERP à l'acquéreur ou au locataire <strong>avant la signature</strong> de l'acte de vente ou du bail. L'obligation s'applique à tous les biens immobiliers, maisons comme appartements.
              </p>
            </div>

            {/* Q2 */}
            <div className="border border-gray-200 p-6 hover:border-bleu-france hover:shadow-sm transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">🚨</span>
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  Que risque-je si je ne l'ai pas ?
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Un ERP absent ou erroné peut entraîner la <strong>nullité de la vente</strong> ou une <strong>réduction du prix</strong> demandée par l'acquéreur. En cas de litige, votre responsabilité civile — voire pénale — peut être engagée. Votre notaire refusera généralement de signer sans ce document.
              </p>
            </div>

            {/* Q3 */}
            <div className="border border-gray-200 p-6 hover:border-bleu-france hover:shadow-sm transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">📅</span>
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  Combien de temps est-il valable ?
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                L'ERP est valable <strong>6 mois</strong>. Si votre vente ou location se conclut après ce délai, vous devrez en obtenir un nouveau. Mieux vaut donc le commander au plus près de la signature plutôt qu'en début de mandat.
              </p>
            </div>

            {/* Q4 */}
            <div className="border border-gray-200 p-6 hover:border-bleu-france hover:shadow-sm transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">✈️</span>
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  C'est quoi l'ENSA et pourquoi c'est nouveau ?
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                L'ENSA (État des Nuisances Sonores Aériennes) est obligatoire depuis le <strong>Décret de mai 2022</strong>. Il concerne tous les biens situés dans un <strong>Plan d'Exposition au Bruit (PEB)</strong> d'aérodrome. Géodiag vérifie automatiquement si votre adresse est concernée — cette vérification est <strong>incluse dans les 9,90 €</strong>.
              </p>
            </div>

            {/* Q5 */}
            <div className="border border-gray-200 p-6 hover:border-bleu-france hover:shadow-sm transition-all">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">🏢</span>
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  Et les autres diagnostics obligatoires ?
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                L'ERP fait partie du <strong>Dossier de Diagnostic Technique (DDT)</strong>, qui regroupe également le DPE, le diagnostic amiante, plomb, électricité, gaz et termites selon l'âge et la localisation du bien. Nos diagnostiqueurs partenaires prennent en charge l'ensemble du dossier en une seule intervention.
              </p>
            </div>

            {/* Q6 */}
            <div className="border border-l-4 border-l-bleu-france bg-blue-50 p-6">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl mt-0.5">💡</span>
                <h3 className="font-bold text-bleu-france text-base leading-snug">
                  Bon à savoir : le risque nul n'existe pas
                </h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                Même un bien situé hors zone à risque déclaré doit disposer d'un ERP mentionnant explicitement l'absence de risque. Un document vierge n'est pas suffisant : c'est le rapport officiel rempli et signé qui a valeur légale. Notre plateforme génère ce document conforme instantanément.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-sm text-gray-600 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <p className="font-bold text-gray-900 mb-2">Géodiag SaaS</p>
            <p>92 rue du Moulin Vert, 75014 Paris</p>
            <p className="mt-4 text-xs">Géodiag est une plateforme privée éditant des documents à partir de l'Open Data de l'État. Ce n'est pas un site gouvernemental.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#" className="hover:underline">Mentions Légales</a>
            <a href="#" className="hover:underline">Données Personnelles (RGPD)</a>
            <a href="#" className="hover:underline">CGV</a>
          </div>
        </div>
      </footer>
    </div>
  );
}