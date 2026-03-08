# Contexte du Projet : DiagX (SaaS Immobilier)

## 1. Vision et Modèle Économique
DiagX (nom commercial public provisoir: Géodiag) est une plateforme SaaS B2C/B2B qui simplifie l'obtention des documents réglementaires immobiliers en France. 
* **Le Hook :** L'utilisateur tape son adresse et obtient instantanément un pré-rapport gratuit de ses risques (Inondation, Sismicité, Radon, Année de construction) grâce à l'Open Data.
* **La Monétisation (Étape 1) :** Un "Paywall" à 9,90 € (via Stripe Payment Links) pour télécharger immédiatement l'État des Risques (ERP) complet et officiel en PDF (Valable 6 mois pour le notaire).
* **L'Upsell (Étape 2) :** Sur la page de succès, le client est incité à demander des devis pour ses autres diagnostics obligatoires (DPE, Amiante). Ces leads sont revendus en B2B à des diagnostiqueurs locaux.

## 2. Stack Technique Actuelle
* **Framework :** Next.js 14+ (App Router).
* **Langage :** TypeScript (typage strict exigé).
* **Style :** Tailwind CSS.
* **Hébergement :** Vercel (Attention aux timeouts des Serverless Functions limités à 10s).
* **Paiement :** Stripe (Payment Links avec redirection vers `/success`).

## 3. Design System et UX
L'interface est strictement inspirée du **DSFR (Design System de l'État Français)** pour maximiser la confiance et justifier le paiement.
* **Couleurs :** Bleu France (`#000091`), Rouge Marianne (`#e1000f`), Fond gris clair (`#f6f6f6`).
* **Style :** Bords carrés, ombres nettes (`shadow-dsfr`), typographie institutionnelle (Public Sans ou Arial), badges d'état ("DÉTECTÉ", "AUCUN RISQUE").
* **Ton :** Administratif, rassurant, juridique et orienté conversion ("Zéro erreur de saisie", "Conforme").

## 4. Architecture Data (API Gouvernementales)

### 4.1 MCP Server data.gouv.fr (Environnement dev)
Un serveur MCP officiel est disponible pour explorer les datasets de data.gouv.fr pendant le développement.
* **URL publique :** `https://mcp.data.gouv.fr/mcp`
* **Config Claude Desktop :** Voir `mcp-config.json` à la racine du projet.
* **Outils :** `search_datasets`, `query_resource_data`, `get_dataset_info`, etc.
* **Service côté app :** `lib/datagouv.ts` — encapsule les mêmes API pour le code Next.js.

### 4.2 API appelées en parallèle (`/api/georisques`)
Le backend interroge 13 API en parallèle (`Promise.all` avec `catch` individuel pour la Graceful Degradation) :

**Existants :**
* **BAN (API Adresse) :** Géocodage (lat/lng).
* **API Carto IGN (Cadastre) :** Section et numéro de parcelle + géométrie GeoJSON.
* **Géorisques GASPAR :** Risques naturels & technologiques (inondation, etc.).
* **Géorisques Radon :** Potentiel radon (catégories 1-3).
* **Géorisques CatNat :** Nombre d'arrêtés de catastrophe naturelle.
* **Géorisques Sismicité :** Zone sismique (1-5).
* **Géorisques ENSA :** Plan d'Exposition au Bruit des aérodromes.
* **ADEME DPE :** Année de construction via la base DPE.
* **IGN GPU :** Zonage PLU (Plan Local d'Urbanisme).
* **DVF Etalab :** Transactions immobilières récentes + prix moyen au m².

**Nouveaux (v5) :**
* **Géorisques SIS :** Secteurs d'Information sur les Sols (pollution connue/suspectée).
* **Géorisques ICPE :** Installations Classées à proximité (sites industriels).
* **Géorisques MVT :** Mouvements de terrain (glissements, effondrements).
* **Géorisques Cavités :** Cavités souterraines (carrières, mines).

### 4.3 Types centralisés
Tous les types de données sont dans `lib/types.ts` : `ErpData`, `DataGouvDataset`, etc.

## 5. Ta Mission Actuelle (Génération PDF "Niveau France-ERP")
L'objectif principal est de générer un PDF ultra-professionnel à la volée lorsque l'utilisateur paie. Nous voulons reproduire la qualité du site `france-erp.com`.
* **Outil recommandé :** `pdf-lib` (côté serveur dans une route API Next.js).
* **La Stratégie :** Ne pas tout dessiner de zéro. Nous allons utiliser un "Template" PDF de base (une belle page de garde à nos couleurs) placé dans le dossier `/public`, et y injecter dynamiquement le texte (adresse, parcelle, résultats Géorisques) avec `pdf-lib`.
* **Le livrable ultime :** Un document qui fusionne notre page de garde esthétique personnalisée avec les pages de formulaires CERFA officiels.

## 6. Consignes de Code pour Claude (Directives Lead Dev)
En tant qu'IA experte, tu dois agir comme un Lead Développeur Full-Stack :
* Privilégie des composants React "Server" ou "Client" clairement identifiés (`"use client"`).
* Écris du code robuste : gère systématiquement les erreurs d'API (fallback UI, try/catch).
* Garde un code propre, moderne, et commente les parties complexes en français.
* Pense toujours à l'UX : si tu proposes une logique de chargement de PDF, ajoute des retours visuels pour le client.