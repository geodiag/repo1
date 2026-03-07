import Link from "next/link";
import Header from "../../components/Header";

export const metadata = {
  title: "ERP + ENSA : deux documents obligatoires — Géodiag",
  description: "ERP (État des Risques et Pollutions) et ENSA (Nuisances Sonores Aériennes) : ce qu'ils contiennent, pourquoi ils sont obligatoires, comment les obtenir.",
};

const erpRisques = [
  {
    icon: "🌊",
    titre: "Risques naturels",
    items: ["Inondation (débordement, submersion)", "Mouvement de terrain (glissement, effondrement)", "Séisme (zonage sismique 1 à 5)", "Avalanche et chutes de blocs", "Feux de forêt"],
    couleur: "blue",
  },
  {
    icon: "🏭",
    titre: "Risques technologiques",
    items: ["Industries classées SEVESO (seuil haut/bas)", "Canalisations de matières dangereuses", "Risque nucléaire (rayon 10 km)", "Rupture de barrage", "Carrières et mines"],
    couleur: "orange",
  },
  {
    icon: "☢️",
    titre: "Pollution & sol",
    items: ["Sites BASIAS (anciennes activités industrielles)", "Sites SIS (secteurs d'information sur les sols)", "Potentiel radon (gaz radioactif naturel — cat. 1 à 3)", "Bruit des infrastructures de transport", "Argiles (retrait-gonflement)"],
    couleur: "red",
  },
  {
    icon: "📋",
    titre: "Historique",
    items: ["Nombre d'arrêtés CATNAT reconnus", "Dates et types de sinistres", "Sinistres liés aux inondations", "Sinistres liés aux mouvements de terrain", "Sinistres liés aux séismes"],
    couleur: "gray",
  },
];

const etapes = [
  {
    num: "01",
    titre: "Saisissez l'adresse",
    desc: "Entrez l'adresse complète du bien sur notre plateforme. Notre moteur interroge automatiquement la base nationale d'adresses (BAN) pour identifier précisément les coordonnées GPS.",
  },
  {
    num: "02",
    titre: "Analyse des données officielles",
    desc: "Nos algorithmes interrogent en temps réel les bases Géorisques, le Cadastre, le PLU et les DVF pour produire une pré-analyse complète des risques associés au bien.",
  },
  {
    num: "03",
    titre: "Paiement sécurisé",
    desc: "Réglez 9,90 € TTC via notre interface de paiement sécurisée Stripe. Aucun compte requis, paiement par carte bancaire en moins d'une minute.",
  },
  {
    num: "04",
    titre: "Téléchargement immédiat",
    desc: "Votre rapport ERP officiel est généré depuis les bases de données publiques de l'État et téléchargé instantanément sur votre appareil. Document conforme, valeur légale garantie.",
  },
];

const faqErp = [
  {
    q: "L'ERP Géodiag a-t-il la même valeur légale qu'un ERP classique ?",
    a: "Oui. Notre plateforme s'appuie sur les données officielles de l'État, issues du registre national des risques prévu par la réglementation. Le document produit est conforme aux exigences du Code de l'environnement (art. L125-5). Notre service simplifie la démarche et vous délivre un document mis en forme, prêt à remettre à l'acquéreur ou au locataire.",
  },
  {
    q: "L'ENSA est-elle incluse dans l'ERP Géodiag ?",
    a: "Oui. Géodiag vérifie automatiquement si votre bien est concerné par un Plan d'Exposition au Bruit (PEB) lors de l'analyse initiale. Cette vérification ENSA est incluse dans le tarif unique de 9,90 €. Si votre bien est en zone PEB, les informations correspondantes figurent dans votre rapport. Si votre bien est hors zone, cela est également attesté.",
  },
  {
    q: "Mon bien n'est dans aucune zone à risque — ai-je quand même besoin d'un ERP ?",
    a: "Absolument. L'obligation ne dépend pas de la présence de risques mais de la mise en vente ou en location du bien. Un ERP mentionnant l'absence de risque est tout aussi obligatoire qu'un ERP signalant des risques. Le document vierge de risques a la même valeur légale.",
  },
  {
    q: "Qui doit remettre l'ERP et à qui ?",
    a: "Le propriétaire vendeur ou bailleur remet l'ERP à l'acquéreur (avant la promesse de vente) ou au locataire (en annexe du contrat de bail). Le notaire en vérifie la présence lors de la signature de l'acte de vente.",
  },
  {
    q: "Que signifie un risque 'détecté' dans mon ERP ?",
    a: "Cela signifie que votre bien est situé dans une zone couverte par un plan de prévention des risques (PPR) approuvé. Cela n'empêche pas la vente mais impose une information claire à l'acquéreur. Des règles de construction ou d'aménagement spécifiques peuvent s'appliquer selon le niveau de risque.",
  },
  {
    q: "L'ERP est valable 6 mois — que se passe-t-il s'il expire ?",
    a: "Vous devez en obtenir un nouveau avant la signature. Un ERP expiré n'a plus de valeur légale. Si votre mandat de vente dure plus de 6 mois, prévoyez de le renouveler. Notre plateforme vous permet de le refaire en 2 minutes pour 9,90 €.",
  },
  {
    q: "Un agent immobilier peut-il faire l'ERP à ma place ?",
    a: "Certains agents intègrent l'ERP dans leur mandat, mais c'est bien le propriétaire qui en reste légalement responsable. Si l'ERP fourni est erroné ou incomplet, c'est le propriétaire — et non l'agent — qui engage sa responsabilité civile.",
  },
];

const risqueNiveaux = [
  { zone: "Zone 1", label: "Sismicité très faible", couleur: "bg-green-100 text-green-800 border-green-300" },
  { zone: "Zone 2", label: "Sismicité faible", couleur: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { zone: "Zone 3", label: "Sismicité modérée", couleur: "bg-orange-100 text-orange-800 border-orange-300" },
  { zone: "Zone 4", label: "Sismicité moyenne", couleur: "bg-red-100 text-red-700 border-red-300" },
  { zone: "Zone 5", label: "Sismicité forte (Antilles)", couleur: "bg-red-200 text-red-900 border-red-400" },
];

export default function ErpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-fond-gris">
      <div className="liseret-tricolore w-full fixed top-0 z-50"></div>
      <Header />

      <main className="flex-grow">

        {/* Hero */}
        <section className="bg-white border-b border-gray-200 py-14">
          <div className="max-w-5xl mx-auto px-4">
            <span className="inline-block bg-blue-50 text-bleu-france font-bold px-3 py-1 text-xs uppercase tracking-widest border border-blue-200 mb-4">
              Document obligatoire
            </span>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              ERP + ENSA : les deux documents<br />obligatoires pour votre transaction
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
              L'ERP (État des Risques et Pollutions) et l'ENSA (État des Nuisances Sonores Aériennes) sont tous deux obligatoires pour toute vente ou location. Géodiag les vérifie ensemble en une seule démarche à 9,90 €.
            </p>
          </div>
        </section>

        {/* Ce que contient l'ERP */}
        <section className="py-14">
          <div className="max-w-5xl mx-auto px-4">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Ce que contient votre rapport ERP</h2>
              <p className="text-sm text-gray-500">Le rapport analyse 4 familles de risques à partir des bases de données officielles de l'État.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {erpRisques.map((r) => (
                <div key={r.titre} className="bg-white border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{r.icon}</span>
                    <h3 className="font-extrabold text-gray-900 text-base">{r.titre}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {r.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-gray-400 mt-0.5 shrink-0">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ENSA */}
        <section className="bg-sky-50 border-t border-b border-sky-200 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <span className="inline-block bg-sky-200 text-sky-800 font-bold px-3 py-1 text-xs uppercase tracking-widest mb-3">Nouveau — Décret 2022</span>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-3">L'ENSA : État des Nuisances Sonores Aériennes</h2>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  Instauré par le Décret n° 2022-789 du 25 mai 2022, l'ENSA est obligatoire pour tout bien situé dans un <strong>Plan d'Exposition au Bruit (PEB)</strong> d'un aérodrome. Il complète l'ERP et doit être remis à l'acquéreur ou au locataire avant la signature.
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-sky-600">›</span>
                    <p><strong>Zones A, B, C, D</strong> — niveaux d'exposition au bruit aérien du moins au plus élevé, définis par arrêté préfectoral autour de chaque aérodrome.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-sky-600">›</span>
                    <p><strong>Biens non concernés</strong> — si votre bien est hors zone PEB, l'ENSA mentionne simplement l'absence d'exposition. Le document reste requis dans les communes incluses dans le périmètre du PEB.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-sky-600">›</span>
                    <p><strong>Vérification automatique</strong> — Géodiag interroge la base nationale des PEB et vous indique instantanément si votre bien est concerné.</p>
                  </div>
                </div>
              </div>
              <div className="md:w-72 shrink-0 bg-white border border-sky-200 p-5 shadow-sm">
                <p className="text-xs font-black uppercase text-sky-700 mb-3">✈️ PEB — Zones d'exposition</p>
                <div className="space-y-2">
                  {[
                    { zone: "Zone A", label: "Gêne très forte", color: "bg-red-100 text-red-800 border-red-300" },
                    { zone: "Zone B", label: "Gêne forte", color: "bg-orange-100 text-orange-800 border-orange-300" },
                    { zone: "Zone C", label: "Gêne modérée", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
                    { zone: "Zone D", label: "Gêne faible", color: "bg-green-100 text-green-800 border-green-300" },
                  ].map((z) => (
                    <div key={z.zone} className={`border px-3 py-2 text-xs flex justify-between items-center ${z.color}`}>
                      <span className="font-black">{z.zone}</span>
                      <span className="font-medium">{z.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-3">Décret n° 2002-626 · Arrêtés préfectoraux PEB</p>
              </div>
            </div>
          </div>
        </section>

        {/* Niveaux sismiques */}
        <section className="bg-white border-t border-b border-gray-200 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Comprendre le zonage sismique</h2>
            <p className="text-sm text-gray-500 mb-6">La France est divisée en 5 zones sismiques définies par décret. Votre ERP indique la zone correspondant à votre commune.</p>
            <div className="flex flex-wrap gap-3">
              {risqueNiveaux.map((n) => (
                <div key={n.zone} className={`border px-4 py-3 text-sm ${n.couleur}`}>
                  <p className="font-black text-xs">{n.zone}</p>
                  <p className="font-medium">{n.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Source : Décret n° 2010-1255 du 22 octobre 2010 portant délimitation des zones de sismicité du territoire français.</p>
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
                Obtenir mon ERP + ENSA — 9,90 € →
              </Link>
              <p className="text-xs text-gray-400 mt-2">🔒 Paiement sécurisé · ERP + vérification ENSA incluse · Valable 6 mois</p>
            </div>
          </div>
        </section>

        {/* Cadre légal */}
        <section className="bg-white border-t border-gray-200 py-12">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold text-gray-900 mb-4">Le cadre légal en bref</h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-bleu-france">›</span>
                    <p><strong>Loi Bachelot (2003)</strong> — Instaure l'obligation d'information sur les risques technologiques et naturels lors des transactions immobilières.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-bleu-france">›</span>
                    <p><strong>Code de l'environnement, art. L125-5</strong> — Précise le contenu obligatoire de l'ERP et les conditions d'application selon les zones à risque.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-bleu-france">›</span>
                    <p><strong>Décret n° 2022-789 (mai 2022)</strong> — Élargit le périmètre de l'ERP au recul du trait de côte et précise les modalités d'information sur le bruit.</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="shrink-0 font-black text-bleu-france">›</span>
                    <p><strong>Sanction en cas d'omission</strong> — Nullité de la vente ou réduction du prix à la demande de l'acquéreur (art. 1638 du Code civil). Responsabilité civile et pénale du vendeur.</p>
                  </div>
                </div>
              </div>
              <div className="md:w-72 shrink-0 bg-blue-50 border border-blue-200 p-5">
                <p className="text-xs font-black uppercase text-bleu-france mb-3">Bon à savoir</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  L'ERP et l'ENSA sont les seuls diagnostics du DDT que vous pouvez réaliser <strong>vous-même ou en ligne</strong>. Les autres diagnostics (DPE, amiante…) nécessitent un professionnel certifié. C'est ce qui rend notre service particulièrement utile : <strong>9,90 € et 2 minutes</strong> suffisent pour obtenir ERP + ENSA en conformité.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8">Questions fréquentes sur l'ERP et l'ENSA</h2>
            <div className="space-y-4">
              {faqErp.map((item, i) => (
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
            <h2 className="text-2xl font-extrabold mb-3">Prêt à obtenir votre ERP + ENSA ?</h2>
            <p className="text-blue-100 mb-6 text-sm">
              Saisissez votre adresse, vérifiez risques et exposition au bruit en temps réel, payez 9,90 € et téléchargez votre rapport officiel complet.
            </p>
            <Link
              href="/"
              className="inline-block bg-white text-bleu-france font-extrabold py-3 px-8 hover:bg-gray-50 transition text-sm"
            >
              Générer mon ERP + ENSA maintenant →
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
