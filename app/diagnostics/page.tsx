import Link from "next/link";
import Header from "../../components/Header";

export const metadata = {
  title: "Diagnostics Immobiliers (Vente & Location) — Géodiag",
  description: "Tout savoir sur les diagnostics obligatoires pour vendre ou louer votre bien : DPE, amiante, plomb, électricité, gaz, termites et plus encore.",
};

const diagnosticsVente = [
  {
    icon: "🌡️",
    code: "DPE",
    label: "Diagnostic de Performance Énergétique",
    obligatoire: "Toujours obligatoire",
    duree: "10 ans",
    desc: "Mesure la consommation d'énergie et l'impact climatique du logement. Il classe le bien de A (très économe) à G (très énergivore). Depuis 2021, le DPE est opposable : l'acheteur peut se retourner contre vous s'il est erroné. Indispensable dès la mise en vente.",
    vente: true,
    location: true,
  },
  {
    icon: "🏭",
    code: "Amiante",
    label: "Diagnostic Amiante (DAPP)",
    obligatoire: "Bien construit avant le 1er juillet 1997",
    duree: "Illimité si négatif",
    desc: "Recherche la présence d'amiante dans les matériaux de construction. L'amiante est interdit en France depuis 1997 mais présent dans des millions de logements anciens. En cas de présence, des travaux de désamiantage peuvent être imposés avant la vente.",
    vente: true,
    location: false,
  },
  {
    icon: "🎨",
    code: "Plomb (CREP)",
    label: "Constat de Risque d'Exposition au Plomb",
    obligatoire: "Bien construit avant 1949",
    duree: "1 an (si positif) / Illimité (si négatif)",
    desc: "Détecte la présence de plomb dans les peintures. Le saturnisme (intoxication au plomb) est un danger grave pour les enfants. Si des peintures dégradées contenant du plomb sont détectées, des travaux de mise en sécurité sont obligatoires avant la vente.",
    vente: true,
    location: true,
  },
  {
    icon: "⚡",
    code: "Électricité",
    label: "Diagnostic Installation Électrique",
    obligatoire: "Installation de plus de 15 ans",
    duree: "3 ans (vente) / 6 ans (location)",
    desc: "Vérifie la conformité et la sécurité de l'installation électrique. Une installation défectueuse est la première cause d'incendie domestique. Ce diagnostic informe l'acquéreur ou le locataire des risques et des travaux à prévoir.",
    vente: true,
    location: true,
  },
  {
    icon: "🔥",
    code: "Gaz",
    label: "Diagnostic Installation Gaz",
    obligatoire: "Installation de plus de 15 ans",
    duree: "3 ans (vente) / 6 ans (location)",
    desc: "Contrôle la sécurité de l'installation intérieure de gaz. Une fuite de gaz peut provoquer une explosion ou un incendie. Obligatoire si le logement est équipé du gaz naturel et que l'installation date de plus de 15 ans.",
    vente: true,
    location: true,
  },
  {
    icon: "🐛",
    code: "Termites",
    label: "État parasitaire (Termites)",
    obligatoire: "Zones définies par arrêté préfectoral",
    duree: "6 mois",
    desc: "Détecte la présence d'insectes xylophages (termites, capricornes) qui fragilisent la structure en bois du bâtiment. Obligatoire dans les zones géographiques à risque définies par la préfecture. En cas de détection, le traitement est à la charge du vendeur.",
    vente: true,
    location: false,
  },
  {
    icon: "📐",
    code: "Loi Carrez",
    label: "Métrage Loi Carrez",
    obligatoire: "Vente en copropriété uniquement",
    duree: "Illimité (sauf travaux)",
    desc: "Certifie la surface privative exacte d'un lot de copropriété. Si la surface réelle est inférieure de plus de 5 % à celle mentionnée dans l'acte, l'acquéreur peut exiger une réduction de prix proportionnelle. Inutile pour les maisons individuelles.",
    vente: true,
    location: false,
  },
  {
    icon: "🌿",
    code: "ERP",
    label: "État des Risques et Pollutions",
    obligatoire: "Toujours obligatoire",
    duree: "6 mois",
    desc: "Informe sur les risques naturels, miniers, technologiques, la pollution des sols et le potentiel radon. Généré à partir des données officielles de l'État (Géorisques). Notre plateforme vous permet de l'obtenir instantanément en ligne.",
    vente: true,
    location: true,
    highlight: true,
  },
];

const faqDiag = [
  {
    q: "Qui doit payer les diagnostics ?",
    a: "Dans le cadre d'une vente, les diagnostics sont à la charge du vendeur. Pour une location, ils sont également à la charge du propriétaire bailleur. Ces coûts ne peuvent pas être répercutés sur le locataire.",
  },
  {
    q: "Que se passe-t-il si un diagnostic est absent ?",
    a: "La vente peut être annulée ou le prix diminué à la demande de l'acquéreur. Pour la location, le bailleur engage sa responsabilité et peut faire l'objet de sanctions. Votre notaire refusera de signer sans le dossier complet.",
  },
  {
    q: "Puis-je réaliser les diagnostics moi-même ?",
    a: "Non. Les diagnostics doivent être réalisés par un diagnostiqueur certifié par un organisme accrédité (COFRAC). Un diagnostic réalisé par le propriétaire lui-même n'a aucune valeur légale.",
  },
  {
    q: "Combien coûtent les diagnostics en moyenne ?",
    a: "Un pack complet (DPE, amiante, plomb, électricité, gaz, termites) coûte entre 300 € et 600 € selon la surface et la localisation du bien. Notre réseau de partenaires certifiés vous propose des devis compétitifs.",
  },
];

export default function DiagnosticsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-fond-gris">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
      <Header />

      <main className="flex-grow">

        {/* Hero */}
        <section className="bg-white border-b border-gray-200 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <span className="inline-block bg-green-100 text-green-800 font-bold px-3 py-1 text-xs uppercase tracking-widest border border-green-300 mb-4">
              Guide complet
            </span>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              Diagnostics immobiliers :<br />tout ce que vous devez savoir
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
              Vente ou location : les diagnostics immobiliers sont des obligations légales. Un dossier incomplet peut bloquer votre transaction ou engager votre responsabilité. Voici le guide clair pour n'en oublier aucun.
            </p>
          </div>
        </section>

        {/* Tableau des diagnostics */}
        <section className="py-14">
          <div className="max-w-5xl mx-auto px-4">

            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">Les diagnostics obligatoires</h2>
              <div className="flex gap-2 text-xs font-bold ml-auto">
                <span className="bg-bleu-france text-white px-2 py-1">V</span>
                <span className="text-gray-500">= Vente</span>
                <span className="bg-green-600 text-white px-2 py-1 ml-2">L</span>
                <span className="text-gray-500">= Location</span>
              </div>
            </div>

            <div className="space-y-4">
              {diagnosticsVente.map((d) => (
                <div
                  key={d.code}
                  className={`bg-white border p-5 flex flex-col sm:flex-row gap-5 ${d.highlight ? "border-bleu-france shadow-md" : "border-gray-200"}`}
                >
                  {/* Icône + code */}
                  <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-center gap-3 sm:gap-1 sm:w-20 sm:text-center">
                    <span className="text-3xl">{d.icon}</span>
                    <span className="text-[10px] font-black uppercase bg-gray-100 border border-gray-200 px-2 py-0.5 text-gray-600 whitespace-nowrap">{d.code}</span>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className={`font-extrabold text-base ${d.highlight ? "text-bleu-france" : "text-gray-900"}`}>{d.label}</h3>
                      <div className="flex gap-1.5">
                        {d.vente    && <span className="bg-bleu-france  text-white text-[10px] font-black px-2 py-0.5">V</span>}
                        {d.location && <span className="bg-green-600   text-white text-[10px] font-black px-2 py-0.5">L</span>}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{d.desc}</p>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="text-gray-500">📋 <strong>Obligation :</strong> {d.obligatoire}</span>
                      <span className="text-gray-500">⏱ <strong>Validité :</strong> {d.duree}</span>
                    </div>
                    {d.highlight && (
                      <Link
                        href="/erp"
                        className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-bleu-france hover:underline"
                      >
                        En savoir plus sur l'ERP →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white border-t border-gray-200 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Questions fréquentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {faqDiag.map((item, i) => (
                <div key={i} className="border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-bleu-france py-12">
          <div className="max-w-3xl mx-auto px-4 text-center text-white">
            <h2 className="text-2xl font-extrabold mb-3">Obtenez votre ERP en 2 minutes</h2>
            <p className="text-blue-100 mb-6 text-sm">
              L'ERP est le seul diagnostic que vous pouvez obtenir immédiatement en ligne, certifié par l'État. Saisissez votre adresse et téléchargez-le instantanément.
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-bleu-france font-extrabold py-3 px-8 hover:bg-gray-50 transition text-sm"
            >
              Générer mon ERP maintenant →
            </Link>
          </div>
        </section>

      </main>

      <footer className="bg-gray-100 border-t border-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 text-sm text-gray-600 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <p className="font-bold text-gray-900 mb-1">Géodiag SaaS</p>
            <p className="text-xs">Plateforme privée — données issues de l'Open Data de l'État.</p>
          </div>
          <div className="flex gap-4 text-xs">
            <a href="#" className="hover:underline">Mentions légales</a>
            <a href="#" className="hover:underline">RGPD</a>
            <a href="#" className="hover:underline">CGV</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
