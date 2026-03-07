import Link from "next/link";
import Header from "../../components/Header";

export const metadata = {
  title: "ENSA — État des Nuisances Sonores Aériennes — Géodiag",
  description: "Tout comprendre sur l'ENSA : ce qu'est le Plan d'Exposition au Bruit (PEB), qui est concerné, pourquoi c'est obligatoire depuis 2022 et comment l'obtenir.",
};

const pebZones = [
  {
    zone: "Zone A",
    label: "Gêne très forte",
    decibels: "> 75 dB(A)",
    desc: "Zone la plus exposée, en bordure immédiate des pistes. Constructions neuves interdites sauf exceptions.",
    color: "bg-red-50 border-red-300 text-red-800",
  },
  {
    zone: "Zone B",
    label: "Gêne forte",
    decibels: "70–75 dB(A)",
    desc: "Constructions neuves à usage d'habitation interdites sauf dans certains secteurs de renouvellement urbain.",
    color: "bg-orange-50 border-orange-300 text-orange-800",
  },
  {
    zone: "Zone C",
    label: "Gêne modérée",
    decibels: "65–70 dB(A)",
    desc: "Constructions neuves autorisées sous conditions d'isolation acoustique renforcée.",
    color: "bg-yellow-50 border-yellow-300 text-yellow-800",
  },
  {
    zone: "Zone D",
    label: "Gêne faible",
    decibels: "55–65 dB(A)",
    desc: "Zone périphérique. Obligation d'isolation acoustique. Information de l'acquéreur obligatoire.",
    color: "bg-green-50 border-green-300 text-green-800",
  },
];

const ensaFaq = [
  {
    q: "L'ENSA est-elle obligatoire pour tous les biens ?",
    a: "Non. L'ENSA ne concerne que les biens situés dans le périmètre d'un Plan d'Exposition au Bruit (PEB) approuvé. Si votre bien est hors zone PEB, aucun ENSA n'est requis. En revanche, si votre commune est incluse dans un PEB, le document doit être annexé à toute promesse de vente ou contrat de bail.",
  },
  {
    q: "Depuis quand l'ENSA est-elle obligatoire ?",
    a: "L'ENSA a été instituée par le Décret n° 2022-789 du 25 mai 2022, qui a modifié l'article R125-26 du Code de l'environnement. Depuis cette date, la vérification de l'exposition au bruit aérien est obligatoire lors de toute transaction immobilière dans les communes concernées.",
  },
  {
    q: "Quelle est la différence entre ERP et ENSA ?",
    a: "L'ERP (État des Risques et Pollutions) traite des risques naturels, technologiques et environnementaux — séismes, inondations, sites pollués, radon… L'ENSA est un document dédié exclusivement aux nuisances sonores liées aux aérodromes, défini par le PEB. Ces deux documents sont complémentaires et souvent requis conjointement pour les biens proches d'un aéroport.",
  },
  {
    q: "Quels sont les principaux aéroports concernés en France ?",
    a: "Tous les aérodromes dotés d'un PEB approuvé sont concernés : Paris-CDG, Paris-Orly, Lyon-Saint-Exupéry, Marseille-Provence, Nice-Côte d'Azur, Bordeaux-Mérignac, Toulouse-Blagnac, Nantes-Atlantique, ainsi que de nombreux aérodromes régionaux et militaires. La liste complète est établie par décision préfectorale.",
  },
  {
    q: "L'ENSA Géodiag a-t-elle valeur légale ?",
    a: "Géodiag vérifie l'exposition au bruit en interrogeant les bases de données officielles de l'État. Cette vérification est incluse dans votre rapport et vous permet de satisfaire à l'obligation d'information. Le rapport généré mentionne clairement si le bien est ou non situé en zone PEB, conformément aux exigences réglementaires.",
  },
  {
    q: "Que se passe-t-il si je ne fournis pas l'ENSA ?",
    a: "Comme pour l'ERP, l'absence d'ENSA peut entraîner la nullité de la vente ou la résolution du bail à l'initiative de l'acquéreur ou du locataire. Le vendeur ou bailleur engage sa responsabilité civile. Le notaire est tenu de vérifier la présence de ce document dans les zones concernées.",
  },
];

const etapes = [
  {
    num: "01",
    titre: "Saisissez l'adresse",
    desc: "Entrez l'adresse complète du bien. Notre moteur interroge la base nationale d'adresses (BAN) pour identifier précisément les coordonnées GPS.",
  },
  {
    num: "02",
    titre: "Vérification PEB automatique",
    desc: "Nos algorithmes interrogent en temps réel la base nationale des Plans d'Exposition au Bruit pour déterminer si votre bien est en zone ENSA.",
  },
  {
    num: "03",
    titre: "ERP + ENSA en 9,90 €",
    desc: "Réglez une seule fois via Stripe. Votre rapport intègre ERP complet et statut ENSA, prêt à remettre à l'acquéreur ou au locataire.",
  },
  {
    num: "04",
    titre: "Téléchargement immédiat",
    desc: "Votre rapport officiel est généré depuis les données de l'État et téléchargé instantanément. Document conforme, valeur légale garantie.",
  },
];

export default function EnsaPage() {
  return (
    <div className="min-h-screen flex flex-col bg-fond-gris">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
      <Header />

      <main className="flex-grow">

        {/* Hero */}
        <section className="bg-white border-b border-gray-200 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-block bg-sky-50 text-sky-700 font-bold px-3 py-1 text-xs uppercase tracking-widest border border-sky-200">
                Document obligatoire
              </span>
              <span className="inline-block bg-blue-50 text-bleu-france font-bold px-3 py-1 text-xs uppercase tracking-widest border border-blue-200">
                ✈️ Nouveau — Décret mai 2022
              </span>
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              ENSA — État des Nuisances Sonores Aériennes :<br />le guide complet
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
              Obligatoire depuis mai 2022 pour les biens situés dans un Plan d'Exposition au Bruit (PEB), l'ENSA informe l'acquéreur ou locataire sur l'exposition sonore liée à un aérodrome. Géodiag l'intègre automatiquement dans votre rapport à 9,90 €.
            </p>
          </div>
        </section>

        {/* Qu'est-ce que le PEB */}
        <section className="py-14">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Qu'est-ce que le Plan d'Exposition au Bruit ?</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <p className="leading-relaxed">
                    Le <strong>Plan d'Exposition au Bruit (PEB)</strong> est un document d'urbanisme qui délimite autour de chaque aérodrome des zones d'exposition sonore classées de A (très forte) à D (faible).
                  </p>
                  <p className="leading-relaxed">
                    Il est approuvé par arrêté préfectoral et s'impose aux collectivités locales pour la délivrance des permis de construire. Chaque zone impose des règles précises en matière de construction et d'isolation acoustique.
                  </p>
                  <p className="leading-relaxed">
                    Depuis le <strong>Décret n° 2022-789 du 25 mai 2022</strong>, tout vendeur ou bailleur d'un bien situé dans une commune couverte par un PEB doit remettre l'ENSA à l'acquéreur ou locataire avant la signature.
                  </p>
                </div>
              </div>
              <div className="bg-sky-50 border border-sky-200 p-5">
                <p className="text-xs font-black uppercase text-sky-700 mb-4">Base légale ENSA</p>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-sky-600">›</span>
                    <p><strong>Code de l'environnement, art. L125-5 et R125-26</strong> — Obligation d'information sur les risques et nuisances lors des transactions immobilières.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-sky-600">›</span>
                    <p><strong>Décret n° 2022-789 du 25 mai 2022</strong> — Crée l'ENSA comme document distinct, distinct de l'ERP, dédié aux nuisances sonores aériennes.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-sky-600">›</span>
                    <p><strong>Code de l'urbanisme, art. L112-10</strong> — Régit l'élaboration des PEB et les restrictions de construction en zones A et B.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Zones PEB */}
        <section className="bg-white border-t border-b border-gray-200 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Les 4 zones du Plan d'Exposition au Bruit</h2>
            <p className="text-sm text-gray-500 mb-6">Définies par arrêté préfectoral, ces zones déterminent les obligations d'information et les règles de construction autour de chaque aérodrome.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {pebZones.map((z) => (
                <div key={z.zone} className={`border p-5 ${z.color}`}>
                  <p className="font-black text-lg mb-1">{z.zone}</p>
                  <p className="font-bold text-sm mb-1">{z.label}</p>
                  <p className="text-xs font-bold mb-2 opacity-70">{z.decibels}</p>
                  <p className="text-xs leading-relaxed opacity-80">{z.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Source : Code de l'urbanisme, art. L112-10 · Arrêtés préfectoraux PEB · Décret n° 2002-626</p>
          </div>
        </section>

        {/* Comment l'obtenir */}
        <section className="py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Comment obtenir votre ERP + ENSA avec Géodiag</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {etapes.map((e) => (
                <div key={e.num} className="bg-white border border-gray-200 p-5 relative">
                  <span className="text-5xl font-black text-gray-100 absolute top-3 right-4 select-none leading-none">{e.num}</span>
                  <p className="text-xs font-black uppercase text-bleu-france mb-2">{e.num}</p>
                  <h3 className="font-extrabold text-gray-900 text-sm mb-2 leading-snug">{e.titre}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{e.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block bg-bleu-france text-white font-extrabold py-3 px-10 hover:bg-bleu-france-hover transition text-sm"
              >
                Vérifier mon bien — ERP + ENSA 9,90 € →
              </Link>
              <p className="text-xs text-gray-400 mt-2">🔒 Paiement sécurisé · Vérification ENSA incluse · Valable 6 mois</p>
            </div>
          </div>
        </section>

        {/* Comparatif ERP vs ENSA */}
        <section className="bg-white border-t border-gray-200 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">ERP vs ENSA : quelles différences ?</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase text-gray-500 font-black">
                    <th className="text-left px-4 py-3 border border-gray-200">Critère</th>
                    <th className="text-left px-4 py-3 border border-gray-200 text-bleu-france">ERP</th>
                    <th className="text-left px-4 py-3 border border-gray-200 text-sky-600">ENSA ✈️</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Objet", "Risques naturels, technologiques, pollution", "Nuisances sonores aériennes (aérodromes)"],
                    ["Obligation légale", "Toute vente/location sans exception", "Uniquement si bien en zone PEB"],
                    ["Base légale", "Code de l'env., art. L125-5", "Décret 2022-789, art. R125-26"],
                    ["Durée de validité", "6 mois", "6 mois"],
                    ["Qui peut le faire", "Propriétaire ou plateforme en ligne", "Propriétaire ou plateforme en ligne"],
                    ["Inclus chez Géodiag", "✅ Oui", "✅ Oui — vérifié automatiquement"],
                  ].map(([crit, erp, ensa], i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 border border-gray-200 font-bold text-gray-700">{crit}</td>
                      <td className="px-4 py-3 border border-gray-200 text-gray-600">{erp}</td>
                      <td className="px-4 py-3 border border-gray-200 text-gray-600">{ensa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Questions fréquentes sur l'ENSA</h2>
            <div className="space-y-4">
              {ensaFaq.map((item, i) => (
                <div key={i} className="bg-white border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.q}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-bleu-france py-12">
          <div className="max-w-3xl mx-auto px-4 text-center text-white">
            <h2 className="text-2xl font-extrabold mb-3">Votre bien est-il en zone PEB ?</h2>
            <p className="text-blue-100 mb-6 text-sm">
              Saisissez votre adresse : Géodiag vérifie automatiquement et instantanément si votre bien est soumis à un Plan d'Exposition au Bruit.
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-bleu-france font-extrabold py-3 px-8 hover:bg-gray-50 transition text-sm"
            >
              Vérifier mon adresse — ERP + ENSA 9,90 € →
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
            <Link href="/erp" className="hover:underline">ERP</Link>
            <a href="#" className="hover:underline">Mentions légales</a>
            <a href="#" className="hover:underline">RGPD</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
