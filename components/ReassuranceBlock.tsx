export default function ReassuranceBlock() {
  return (
    <div className="bg-white p-6 md:p-8 shadow-sm border border-gray-200 flex flex-col gap-5 border-t-4 border-t-bleu-france">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">🏛️</span>
        L'ERP : Un document administratif complexe
      </h3>
      <p className="text-sm text-gray-700 leading-relaxed">
        Les propriétaires vendeurs ou bailleurs sont tenus de fournir un État des Risques. Notre plateforme simplifie cette démarche fastidieuse en compilant instantanément les données officielles pour éviter toute erreur juridique.
      </p>
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-start gap-3">
          <span className="text-green-600 mt-1 text-lg leading-none">✅</span>
          <div>
            <strong className="text-sm text-gray-900">100% Conforme & Officiel</strong>
            <p className="text-xs text-gray-600 mt-1">Document réglementaire de 6 mois exigé par votre notaire lors de la transaction.</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-green-600 mt-1 text-lg leading-none">✅</span>
          <div>
            <strong className="text-sm text-gray-900">Zéro Erreur de Saisie</strong>
            <p className="text-xs text-gray-600 mt-1">Génération automatisée et sécurisée à partir des bases de données gouvernementales.</p>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <span>Sources interrogées :</span>
        <span className="text-gray-800 flex items-center gap-1"><span className="text-green-600">●</span> GÉORISQUES</span>
        <span className="text-gray-800 flex items-center gap-1"><span className="text-green-600">●</span> CADASTRE</span>
        <span className="text-gray-800 flex items-center gap-1"><span className="text-green-600">●</span> DVF</span>
        <span className="text-gray-800 flex items-center gap-1"><span className="text-green-600">●</span> PLU</span>
        <span className="text-gray-800 flex items-center gap-1"><span className="text-green-600">●</span> ADEME</span>
      </div>
    </div>
  );
}
