// Fichier de preview standalone — copier/coller dans un sandbox React (CodeSandbox, StackBlitz)
// ou importer dans votre app Next.js via : import BuildingDashboard from './BuildingDashboard'

import { useState } from "react";
import {
  MapPin, Calendar, Home, Zap, Flame, Wind, Layers, Sun,
  AlertTriangle, CheckCircle, XCircle, Radio, Building2,
  Antenna, FlaskConical, Bug, Droplets, Volume2, ShieldAlert,
  ChevronRight, Info, Map, Landmark,
} from "lucide-react";

// ═══ JSON MOCK ══════════════════════════════════════════════════════════════
const buildingData = {
  ban: {
    adresse: "23 Rue du Maréchal Foch", code_postal: "69003", ville: "Lyon",
    departement: "Rhône (69)", gps: { lat: 45.748, lng: 4.857 }, altitude: 173,
  },
  bdnb: {
    id: "bdnb-bg-X8AY-QVG3-VCW6", type_bien: "Appartement",
    annee_construction: 1965, nb_logements: 12, surface_shon: 850,
    hauteur_batiment: 14.5, usage: "Résidentiel collectif",
  },
  ademe: {
    etiquette_dpe: "E", conso_energie: 311, ges: 67, etiquette_ges: "D",
    cout_chauffage: "1 800 – 2 460 €/an", type_chauffage: "Gaz collectif",
    type_ecs: "Gaz individuel", type_isolation: "Isolation partielle",
    type_toiture: "Toit terrasse", type_vitrage: "Double vitrage", annee_dpe: 2023,
  },
  cadastre: {
    prefixe: "000", section: "AB", numero: "0147", surface_parcelle: 420,
    adresse_parcelle: "23 RUE DU MARECHAL FOCH", contenance: 420,
  },
  gpu: {
    zone_plu: "UA", libelle_zone: "Zone urbaine mixte à dominante d'habitat",
    droit_preemption: true, type_dpu: "DPU simple",
    secteur_sauvegarde: false, plan_risque: false,
  },
  georisques: {
    sismicite: 2, argiles: "Moyen", radon: 2, ret_gonflement: "Moyen",
    termites: true, merule: false, ensa_bruit: true, ensa_classe: "Cl. 2",
    distance_basias: 320, nb_basias_500m: 2,
    antennes_5g_proximite: true, nb_antennes_5g: 3,
    inondation_ppr: false, catnat_count: 3, icpe_count: 1,
  },
};

// ═══ SOUS-COMPOSANTS ════════════════════════════════════════════════════════

function Badge({ children, color = "gray" }) {
  const c = {
    gray:   "bg-gray-100 text-gray-600 border-gray-200",
    blue:   "bg-blue-50  text-blue-700  border-blue-200",
    green:  "bg-green-50 text-green-700 border-green-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red:    "bg-red-50   text-red-700   border-red-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  }[color] || "bg-gray-100 text-gray-600 border-gray-200";
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${c}`}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={`bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}>{children}</div>;
}

function CardHeader({ icon: Icon, title, color = "text-gray-700", source }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
      <div className="flex items-center gap-2">
        <Icon size={13} className={`${color} flex-shrink-0`} />
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{title}</span>
      </div>
      {source && <span className="text-[10px] text-gray-400">{source}</span>}
    </div>
  );
}

function DataRow({ label, value, bold, className = "" }) {
  return (
    <div className={`flex items-start justify-between py-1 gap-2 ${className}`}>
      <span className="text-[11px] text-gray-500 flex-shrink-0">{label}</span>
      <span className={`text-[11px] text-right ${bold ? "font-semibold text-gray-800" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}

function ProgressBar({ value, max, level, label, sublabel }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = level === "high" ? "bg-red-500" : level === "medium" ? "bg-orange-400" : "bg-emerald-500";
  const textColor = level === "high" ? "text-red-600" : level === "medium" ? "text-orange-600" : "text-emerald-600";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-600 font-medium">{label}</span>
        <span className={`text-[11px] font-bold ${textColor}`}>{sublabel}</span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScorePill({ value, label, color }) {
  const c = {
    green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    orange: "bg-orange-100 text-orange-800 border-orange-300",
    red: "bg-red-100 text-red-800 border-red-300",
    blue: "bg-blue-100 text-blue-800 border-blue-300",
    purple: "bg-purple-100 text-purple-800 border-purple-300",
    gray: "bg-gray-100 text-gray-700 border-gray-300",
  }[color] || "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <div className={`inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-md border text-center ${c}`}>
      <span className="text-lg font-black leading-none">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

function RiskRow({ label, value, status }) {
  const icon = status === "ok"
    ? <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
    : status === "warn"
    ? <AlertTriangle size={12} className="text-orange-500 flex-shrink-0" />
    : <XCircle size={12} className="text-red-500 flex-shrink-0" />;
  const textColor = status === "ok" ? "text-emerald-700" : status === "warn" ? "text-orange-700" : "text-red-700";
  return (
    <div className="flex items-center justify-between py-1 gap-2">
      <div className="flex items-center gap-1.5">{icon}<span className="text-[11px] text-gray-600">{label}</span></div>
      <span className={`text-[11px] font-semibold ${textColor}`}>{value}</span>
    </div>
  );
}

// ── Étiquette DPE ──────────────────────────────────────────────────────────
function DpeScale({ classeEnergie, classeGes, conso, ges }) {
  const classes = ["A","B","C","D","E","F","G"];
  const energyColors = {
    A:{bar:"#319834"}, B:{bar:"#33c240"}, C:{bar:"#cbe516"},
    D:{bar:"#f7e614"}, E:{bar:"#f0ae13"}, F:{bar:"#e7731a"}, G:{bar:"#dd1e26"},
  };
  const gesColors = {
    A:"#dfc4f7",B:"#c9a2e6",C:"#b580d5",D:"#a05ec4",E:"#8b3cb3",F:"#7618a1",G:"#5f0090",
  };
  const widths = [32,40,48,57,70,82,92];

  return (
    <div className="flex gap-4 items-start">
      {/* Énergie */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Consommation — kWh/m²/an</p>
        <div className="space-y-[3px]">
          {classes.map((cls, i) => {
            const isActive = cls === classeEnergie;
            return (
              <div key={cls} className="flex items-center gap-1.5">
                <div
                  style={{
                    backgroundColor: energyColors[cls].bar,
                    width: `${widths[i]}%`,
                    height: isActive ? "22px" : "14px",
                    opacity: isActive ? 1 : 0.55,
                    clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)",
                    display: "flex", alignItems: "center", paddingLeft: "8px", borderRadius: "2px",
                  }}
                >
                  <span style={{ color:"#fff", fontWeight:900, fontSize: isActive ? "11px" : "8px" }}>{cls}</span>
                </div>
                {isActive && <span className="text-[10px] font-bold" style={{color: energyColors[cls].bar}}>{conso} kWh</span>}
              </div>
            );
          })}
        </div>
      </div>
      {/* GES */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Émissions GES — kgCO₂/m²/an</p>
        <div className="space-y-[3px]">
          {classes.map((cls, i) => {
            const isActive = cls === classeGes;
            return (
              <div key={cls} className="flex items-center gap-1.5">
                <div
                  style={{
                    backgroundColor: gesColors[cls],
                    width: `${widths[i]}%`,
                    height: isActive ? "22px" : "14px",
                    opacity: isActive ? 1 : 0.55,
                    clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)",
                    display: "flex", alignItems: "center", paddingLeft: "8px", borderRadius: "2px",
                  }}
                >
                  <span style={{ color:"#fff", fontWeight:900, fontSize: isActive ? "11px" : "8px" }}>{cls}</span>
                </div>
                {isActive && <span className="text-[10px] font-bold text-purple-700">{ges} kg</span>}
              </div>
            );
          })}
        </div>
      </div>
      {/* Lettres grandes */}
      <div className="flex flex-col items-center gap-3 pl-2">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-2xl text-white shadow"
            style={{backgroundColor: energyColors[classeEnergie]?.bar ?? "#888"}}>{classeEnergie}</div>
          <p className="text-[9px] text-gray-400 mt-0.5 font-medium">ÉNERGIE</p>
        </div>
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-2xl text-white shadow"
            style={{backgroundColor: gesColors[classeGes] ?? "#888"}}>{classeGes}</div>
          <p className="text-[9px] text-gray-400 mt-0.5 font-medium">GES</p>
        </div>
      </div>
    </div>
  );
}

// ═══ COMPOSANT PRINCIPAL ════════════════════════════════════════════════════
export default function BuildingDashboard({ data = buildingData }) {
  const { ban, bdnb, ademe, cadastre, gpu, georisques } = data;

  const sismiLevel   = georisques.sismicite >= 4 ? "high" : georisques.sismicite >= 2 ? "medium" : "low";
  const argileLevel  = georisques.argiles === "Fort" ? "high" : georisques.argiles === "Moyen" ? "medium" : "low";
  const radonLevel   = georisques.radon >= 3 ? "high" : georisques.radon >= 2 ? "medium" : "low";
  const retGonfLevel = georisques.ret_gonflement === "Fort" ? "high" : georisques.ret_gonflement === "Moyen" ? "medium" : "low";

  return (
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"'Inter',sans-serif"}}>

      {/* ─ TOPBAR ─ */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-600" />
          <span className="text-[12px] font-bold text-gray-700">DIAGX</span>
          <ChevronRight size={12} className="text-gray-400" />
          <span className="text-[11px] text-gray-500">Fiche Bâtiment</span>
          <ChevronRight size={12} className="text-gray-400" />
          <span className="text-[11px] text-gray-400 font-mono">{bdnb.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="blue"><Info size={10}/> Open Data</Badge>
          <Badge color="gray">Maj. {ademe.annee_dpe}</Badge>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 py-4 space-y-3">

        {/* ─ EN-TÊTE ─ */}
        <Card>
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-white"/>
              </div>
              <div className="min-w-0">
                <h1 className="text-[20px] font-black text-gray-900 leading-tight">{ban.adresse}</h1>
                <p className="text-[13px] text-gray-500 font-medium mt-0.5">{ban.code_postal} {ban.ville} — {ban.departement}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">{ban.gps.lat}°N, {ban.gps.lng}°E · Alt. {ban.altitude} m</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <ScorePill value={bdnb.annee_construction} label="Année" color="blue"/>
              <ScorePill value={bdnb.type_bien} label="Usage" color="gray"/>
              <ScorePill value={ademe.etiquette_dpe} label="DPE" color={["A","B","C"].includes(ademe.etiquette_dpe) ? "green" : ["D","E"].includes(ademe.etiquette_dpe) ? "orange" : "red"}/>
              <ScorePill value={bdnb.nb_logements} label="Logements" color="purple"/>
            </div>
          </div>
        </Card>

        {/* ─ GRILLE PRINCIPALE ─ */}
        <div className="grid grid-cols-12 gap-3">

          {/* ── Performance Énergétique (8 cols) ── */}
          <div className="col-span-8 space-y-3">
            <Card>
              <CardHeader icon={Zap} title="Performance Énergétique" color="text-amber-500" source="Source : ADEME — DPE"/>
              <div className="p-4">
                <DpeScale classeEnergie={ademe.etiquette_dpe} classeGes={ademe.etiquette_ges} conso={ademe.conso_energie} ges={ademe.ges}/>
                <div className="mt-4 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3">
                  {[
                    {icon:Flame,  label:"Chauffage", value:ademe.type_chauffage},
                    {icon:Layers, label:"Isolation",  value:ademe.type_isolation},
                    {icon:Sun,    label:"Toiture",    value:ademe.type_toiture},
                    {icon:Wind,   label:"Vitrage",    value:ademe.type_vitrage},
                  ].map(({icon:Icon,label,value}) => (
                    <div key={label} className="bg-gray-50 rounded-md px-3 py-2 border border-gray-100">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={11} className="text-gray-400"/>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                      </div>
                      <p className="text-[11px] font-semibold text-gray-700">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                  <span className="text-[11px] text-amber-700 font-medium">Estimation coût chauffage annuel</span>
                  <span className="text-[12px] font-black text-amber-800">{ademe.cout_chauffage}</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader icon={Building2} title="Caractéristiques Bâtiment" color="text-indigo-500" source="Source : BDNB"/>
              <div className="px-4 py-3 grid grid-cols-3 gap-x-6 divide-x divide-gray-100">
                <div className="space-y-0.5">
                  <DataRow label="Type de bien"  value={bdnb.type_bien}  bold/>
                  <DataRow label="Usage"         value={bdnb.usage}/>
                  <DataRow label="Nb logements"  value={bdnb.nb_logements} bold/>
                </div>
                <div className="pl-6 space-y-0.5">
                  <DataRow label="Surface SHON"  value={`${bdnb.surface_shon} m²`} bold/>
                  <DataRow label="Hauteur"        value={`${bdnb.hauteur_batiment} m`}/>
                  <DataRow label="Année constr." value={bdnb.annee_construction} bold/>
                </div>
                <div className="pl-6 space-y-0.5">
                  <DataRow label="Code postal"  value={ban.code_postal}/>
                  <DataRow label="Commune"      value={ban.ville} bold/>
                  <DataRow label="Altitude"     value={`${ban.altitude} m NGF`}/>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Identité Parcellaire (4 cols) ── */}
          <div className="col-span-4 space-y-3">
            <Card>
              <CardHeader icon={Map} title="Identité Cadastrale" color="text-violet-500" source="Source : IGN APICarto"/>
              <div className="px-4 py-3 space-y-0.5">
                <DataRow label="Préfixe" value={cadastre.prefixe}/>
                <DataRow label="Section" value={<span className="font-black text-violet-600 text-[13px]">{cadastre.section}</span>}/>
                <DataRow label="Numéro parcelle" value={<span className="font-black text-violet-600 text-[13px]">{cadastre.numero}</span>}/>
                <div className="h-px bg-gray-100 my-1.5"/>
                <DataRow label="Surface parcelle" value={`${cadastre.surface_parcelle} m²`} bold/>
                <DataRow label="Contenance" value={`${cadastre.contenance} m²`}/>
                <DataRow label="Adresse cadastre" value={cadastre.adresse_parcelle}/>
              </div>
            </Card>

            <Card>
              <CardHeader icon={Landmark} title="Réglementation Urbaine" color="text-teal-600" source="Source : IGN GPU"/>
              <div className="px-4 py-3 space-y-0.5">
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Zone PLU</span>
                    <span className="text-[18px] font-black text-teal-600 leading-none">{gpu.zone_plu}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 italic leading-snug">{gpu.libelle_zone}</p>
                </div>
                <div className="h-px bg-gray-100 my-1.5"/>
                <RiskRow label="Droit de préemption" value={gpu.droit_preemption ? gpu.type_dpu : "Non"} status={gpu.droit_preemption ? "warn" : "ok"}/>
                <RiskRow label="Secteur sauvegardé"  value={gpu.secteur_sauvegarde ? "Oui" : "Non"}  status={gpu.secteur_sauvegarde ? "warn" : "ok"}/>
                <RiskRow label="Plan de risque"       value={gpu.plan_risque ? "Oui" : "Non"}         status={gpu.plan_risque ? "warn" : "ok"}/>
              </div>
            </Card>

            <Card>
              <CardHeader icon={MapPin} title="Localisation GPS" color="text-blue-500" source="Source : BAN"/>
              <div className="px-4 py-3">
                <div className="bg-gray-100 rounded-md h-20 flex items-center justify-center border border-gray-200 mb-2 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10" style={{backgroundImage:"repeating-linear-gradient(0deg,#94a3b8 0,#94a3b8 1px,transparent 1px,transparent 20px),repeating-linear-gradient(90deg,#94a3b8 0,#94a3b8 1px,transparent 1px,transparent 20px)"}}/>
                  <div className="text-center z-10"><MapPin size={18} className="text-blue-500 mx-auto"/><span className="text-[9px] font-semibold text-gray-500 block mt-1">Vue cartographique</span></div>
                </div>
                <DataRow label="Latitude"  value={`${ban.gps.lat}°N`} bold/>
                <DataRow label="Longitude" value={`${ban.gps.lng}°E`} bold/>
                <DataRow label="Altitude"  value={`${ban.altitude} m`}/>
              </div>
            </Card>
          </div>
        </div>

        {/* ─ ERP FULL WIDTH ─ */}
        <Card>
          <CardHeader icon={ShieldAlert} title="État des Risques et Pollutions (ERP)" color="text-red-500" source="Source : Géorisques / GASPAR"/>
          <div className="grid grid-cols-3 divide-x divide-gray-100">

            {/* Bloc 1 — Aléas Naturels */}
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">Aléas Naturels</p>
              <ProgressBar value={georisques.sismicite} max={5} level={sismiLevel} label="Sismicité" sublabel={`Zone ${georisques.sismicite}/5`}/>
              <ProgressBar value={{Fort:3,Moyen:2,Faible:1}[georisques.argiles]||1} max={3} level={argileLevel} label="Retrait-gonflement argiles" sublabel={georisques.argiles}/>
              <ProgressBar value={georisques.radon} max={3} level={radonLevel} label="Potentiel Radon" sublabel={`Zone ${georisques.radon}/3`}/>
              <ProgressBar value={{Fort:3,Moyen:2,Faible:1}[georisques.ret_gonflement]||1} max={3} level={retGonfLevel} label="Ret.-gonfl. sols argileux" sublabel={georisques.ret_gonflement}/>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-[11px] text-gray-500">Arrêtés CatNat</span>
                <Badge color={georisques.catnat_count > 0 ? "orange" : "green"}>{georisques.catnat_count} arrêté{georisques.catnat_count > 1 ? "s" : ""}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Inondation PPR</span>
                <Badge color={georisques.inondation_ppr ? "red" : "green"}>{georisques.inondation_ppr ? "Classé" : "Non classé"}</Badge>
              </div>
              <p className="text-[10px] text-gray-400 pt-1">Source : Géorisques / GASPAR</p>
            </div>

            {/* Bloc 2 — Nuisances */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">Nuisances & Santé</p>
              <div className="space-y-0.5">
                <RiskRow label="Termites" value={georisques.termites ? "Zone infestée" : "Non concerné"} status={georisques.termites ? "danger" : "ok"}/>
                <RiskRow label="Mérule" value={georisques.merule ? "Zone à risque" : "Non concerné"} status={georisques.merule ? "danger" : "ok"}/>
                <RiskRow label="Bruit aérien (ENSA)" value={georisques.ensa_bruit ? `Classé ${georisques.ensa_classe}` : "Non concerné"} status={georisques.ensa_bruit ? "warn" : "ok"}/>
              </div>
              <div className="h-px bg-gray-100 my-3"/>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">ICPE & Activités</p>
              <RiskRow label="Sites ICPE à proximité" value={`${georisques.icpe_count} site${georisques.icpe_count > 1 ? "s" : ""}`} status={georisques.icpe_count > 0 ? "warn" : "ok"}/>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  {label:"Termites", active:georisques.termites,   icon:Bug,      color:"red"},
                  {label:"Mérule",   active:georisques.merule,     icon:Droplets, color:"orange"},
                  {label:"Bruit",    active:georisques.ensa_bruit, icon:Volume2,  color:"orange"},
                ].map(({label,active,icon:Icon,color}) => (
                  <div key={label} className={`rounded-md p-2 flex flex-col items-center gap-1 border ${active ? (color==="red" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200") : "bg-gray-50 border-gray-200"}`}>
                    <Icon size={14} className={active ? (color==="red" ? "text-red-500" : "text-orange-500") : "text-gray-300"}/>
                    <span className="text-[9px] font-semibold text-gray-500 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3">Source : Géorisques / arrêtés préfectoraux</p>
            </div>

            {/* Bloc 3 — Proximité */}
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">Proximité & Environnement</p>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <FlaskConical size={12} className="text-purple-500"/>
                  <span className="text-[11px] font-bold text-gray-600">Sites pollués (BASIAS)</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">Distance site + proche</span>
                  <Badge color={georisques.distance_basias < 200 ? "red" : georisques.distance_basias < 500 ? "orange" : "green"}>{georisques.distance_basias} m</Badge>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500">Nb sites dans 500 m</span>
                  <Badge color={georisques.nb_basias_500m > 0 ? "orange" : "green"}>{georisques.nb_basias_500m} site{georisques.nb_basias_500m > 1 ? "s" : ""}</Badge>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-orange-400" style={{width:`${Math.min(100,(georisques.distance_basias/1000)*100)}%`}}/>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Distance sur 1 km max</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Antenna size={12} className="text-blue-500"/>
                  <span className="text-[11px] font-bold text-gray-600">Antennes 5G à proximité</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Antennes détectées</span>
                  <Badge color={georisques.antennes_5g_proximite ? "blue" : "green"}>{georisques.antennes_5g_proximite ? `${georisques.nb_antennes_5g} antennes` : "Aucune"}</Badge>
                </div>
              </div>
              {/* Tableau récap */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between py-1 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Indicateur</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Statut</span>
                </div>
                {[
                  {label:"Sismicité", val:`Zone ${georisques.sismicite}`, c: sismiLevel==="high"?"red":sismiLevel==="medium"?"orange":"green"},
                  {label:"Radon",     val:`Classe ${georisques.radon}`,   c: radonLevel==="high"?"red":radonLevel==="medium"?"orange":"green"},
                  {label:"Argiles",   val:georisques.argiles,             c: argileLevel==="high"?"red":argileLevel==="medium"?"orange":"green"},
                  {label:"Termites",  val:georisques.termites?"Oui":"Non",c: georisques.termites?"red":"green"},
                  {label:"ICPE",      val:`${georisques.icpe_count} site`,c: georisques.icpe_count>0?"orange":"green"},
                ].map(({label,val,c}) => (
                  <div key={label} className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] text-gray-600">{label}</span>
                    <Badge color={c}>{val}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3">Source : ANFR / BASIAS / Géorisques</p>
            </div>
          </div>
        </Card>

        {/* FOOTER */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 pb-2">
          <span>Données Open Data · BAN · BDNB · ADEME · IGN · Géorisques · ANFR</span>
          <span className="font-mono">{bdnb.id}</span>
        </div>
      </div>
    </div>
  );
}
