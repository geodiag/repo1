import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

// Forcer le mode dynamique (pas de cache Next.js)
export const dynamic = 'force-dynamic';

// ⏱️ Augmenter le timeout Vercel à 60s (requis pour pdf-lib sur CERFA 14 pages)
// Plan Hobby = 10s max ; Plan Pro = 60s. Sur Hobby, simplifie en ne copiant que 3 pages.
export const maxDuration = 60;

// ── Cache module-level du template CERFA ──────────────────────────────────────
// Chargé une seule fois au démarrage de la fonction (warm start), pas à chaque requête.
let _templateBytes: Uint8Array | null = null;
function getTemplateBytes(): Uint8Array {
  if (!_templateBytes) {
    const p = path.join(process.cwd(), 'public', 'exemple-formulaire-etat-des-risques-pollutions-erp.pdf');
    if (!fs.existsSync(p)) {
      throw new Error(`Template CERFA introuvable : ${p}`);
    }
    _templateBytes = new Uint8Array(fs.readFileSync(p));
    console.log(`✅ [ERP-PDF] Template chargé : ${(_templateBytes.length / 1024).toFixed(0)} Ko`);
  }
  return _templateBytes;
}

// ── Couleurs DSFR ──────────────────────────────────────────────────────────────
const BLEU   = rgb(0, 0, 0.569);       // #000091
const ROUGE  = rgb(0.882, 0, 0.059);   // #e1000f
const GRIS_F = rgb(0.965, 0.965, 0.965); // #f6f6f6
const NOIR   = rgb(0, 0, 0);
const BLANC  = rgb(1, 1, 1);
const GRIS   = rgb(0.4, 0.4, 0.4);
const VERT   = rgb(0.133, 0.545, 0.133);
const ORANGE = rgb(0.85, 0.55, 0.1);

// ── Helpers ────────────────────────────────────────────────────────────────────
const PAGE_W = 595;
const PAGE_H = 842;

/** Convertir coordonnées form_structure (y from top) → pdf-lib (y from bottom) */
function yFromTop(topVal: number): number {
  return PAGE_H - topVal;
}

/** Dessiner un rectangle blanc pour masquer du texte existant */
function whiteOut(page: PDFPage, x: number, topY: number, w: number, h: number) {
  page.drawRectangle({
    x,
    y: yFromTop(topY + h),
    width: w,
    height: h,
    color: BLANC,
    borderWidth: 0,
  });
}

/** Tronquer un texte s'il dépasse une largeur max (approximatif) */
function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? text.substring(0, maxChars - 1) + '…' : text;
}

// ── Route principale ───────────────────────────────────────────────────────────
// POST : le client envoie directement les données erpData dans le body
// (évite le deadlock Next.js causé par un fetch interne vers /api/georisques)
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { adresse, city, insee, lat, lon, erpData } = body || {};

  if (!adresse || !insee) {
    return NextResponse.json({ error: 'Paramètres manquants (adresse, insee).' }, { status: 400 });
  }

  try {
    // ── 1. Données risques envoyées directement par le client ────────────────
    const r: any = erpData || {};
    console.log('📄 [ERP-PDF] Données reçues — inondation:', r.inondation, 'sismicité:', r.sismicite);

    // ── 2. Charger le template CERFA (cache module-level) ────────────────────
    const templateBytes = getTemplateBytes();
    const templateDoc = await PDFDocument.load(templateBytes);

    // ── 3. Créer le document final ───────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COUVERTURE DSFR (générée from scratch)
    // ══════════════════════════════════════════════════════════════════════════
    const cover = pdfDoc.addPage([PAGE_W, PAGE_H]);

    // ── Bandeau supérieur bleu ──
    cover.drawRectangle({ x: 0, y: PAGE_H - 60, width: PAGE_W, height: 60, color: BLEU });
    cover.drawText('GÉODIAG', { x: 30, y: PAGE_H - 25, size: 18, font: helveticaBold, color: BLANC });
    cover.drawText('État des Risques et Pollutions', { x: 30, y: PAGE_H - 45, size: 10, font: helvetica, color: rgb(0.7, 0.7, 1) });

    // ── Mention réglementaire ──
    cover.drawRectangle({ x: 300, y: PAGE_H - 55, width: 275, height: 30, color: rgb(0, 0, 0.45) });
    cover.drawText('ÉTAT DES RISQUES ET POLLUTIONS', { x: 307, y: PAGE_H - 42, size: 8.5, font: helveticaBold, color: BLANC });
    cover.drawText('Art. L125-5 à L125-7 du code de l\'environnement', { x: 307, y: PAGE_H - 52, size: 6.5, font: helvetica, color: rgb(0.75, 0.75, 1) });

    // ── Ligne rouge ──
    cover.drawRectangle({ x: 0, y: PAGE_H - 63, width: PAGE_W, height: 3, color: ROUGE });

    // ── Bloc adresse ──
    let curY = PAGE_H - 90;
    cover.drawText('Adresse du bien', { x: 30, y: curY, size: 8, font: helvetica, color: GRIS });
    curY -= 16;
    cover.drawText(truncate(adresse, 80), { x: 30, y: curY, size: 12, font: helveticaBold, color: NOIR });

    // ── Infos parcelle ──
    curY -= 25;
    cover.drawRectangle({ x: 25, y: curY - 5, width: PAGE_W - 50, height: 55, color: GRIS_F });
    const infoY = curY + 35;
    const cols = [
      { label: 'Date de commande', value: today },
      { label: 'Commune', value: city || '–' },
      { label: 'Code INSEE', value: insee },
      { label: 'Parcelle', value: r.parcelleRef || '–' },
    ];
    cols.forEach((col, i) => {
      const x = 35 + i * 133;
      cover.drawText(col.label, { x, y: infoY, size: 7, font: helvetica, color: GRIS });
      cover.drawText(col.value, { x, y: infoY - 13, size: 9, font: helveticaBold, color: NOIR });
    });

    // ── Coordonnées ──
    cover.drawText(`Lat ${lat}  ·  Lon ${lon}`, { x: 35, y: infoY - 30, size: 7, font: helvetica, color: GRIS });
    cover.drawText(`Section : ${r.parcelleSection || '–'}  ·  Numéro : ${r.parcelleNumero || '–'}  ·  Surface : ${r.parcelleSurface || '–'}`, {
      x: 200, y: infoY - 30, size: 7, font: helvetica, color: GRIS,
    });

    // ── RÉSUMÉ DES RISQUES (grille de badges) ──
    curY -= 70;
    cover.drawText('SYNTHÈSE DES RISQUES IDENTIFIÉS', { x: 30, y: curY, size: 10, font: helveticaBold, color: BLEU });
    curY -= 5;
    cover.drawRectangle({ x: 30, y: curY, width: 200, height: 2, color: ROUGE });
    curY -= 20;

    // Fonction utilitaire pour dessiner un badge de risque
    function drawRiskBadge(
      page: PDFPage, x: number, y: number, w: number,
      label: string, value: string, level: 'green' | 'orange' | 'red' | 'gray'
    ) {
      const bgColor = level === 'green' ? rgb(0.92, 0.98, 0.92)
                     : level === 'orange' ? rgb(1, 0.96, 0.9)
                     : level === 'red' ? rgb(1, 0.92, 0.92)
                     : GRIS_F;
      const txtColor = level === 'green' ? VERT
                      : level === 'orange' ? ORANGE
                      : level === 'red' ? ROUGE
                      : GRIS;
      page.drawRectangle({ x, y: y - 35, width: w, height: 45, color: bgColor });
      page.drawRectangle({ x, y: y + 10, width: w, height: 2, color: txtColor });
      page.drawText(label, { x: x + 6, y: y, size: 7, font: helvetica, color: GRIS });
      page.drawText(truncate(value, 28), { x: x + 6, y: y - 14, size: 8, font: helveticaBold, color: txtColor });
    }

    // Déterminer les niveaux
    const inondLevel   = r.inondation ? 'red' : 'green';
    const sismLevel    = r.sismicite?.includes('1') ? 'green' : r.sismicite?.includes('2') ? 'green' : r.sismicite?.includes('4') || r.sismicite?.includes('5') ? 'red' : 'orange';
    const radonLevel   = r.potentielRadon?.includes('3') ? 'red' : r.potentielRadon?.includes('2') ? 'orange' : 'green';
    const techLevel    = r.technologique ? 'orange' : 'green';

    const badgeW = 170;
    const gap = 10;
    const startX = 30;

    // Ligne 1
    drawRiskBadge(cover, startX, curY, badgeW, 'Inondation', r.inondation ? 'ZONE À RISQUE' : 'AUCUN RISQUE', inondLevel);
    drawRiskBadge(cover, startX + badgeW + gap, curY, badgeW, 'Sismicité', r.sismicite || 'Non déterminé', sismLevel);
    drawRiskBadge(cover, startX + 2 * (badgeW + gap), curY, badgeW - 15, 'Radon', r.potentielRadon || 'Non classé', radonLevel);

    curY -= 60;
    // Ligne 2
    drawRiskBadge(cover, startX, curY, badgeW, 'Risque technologique', r.technologique ? 'ZONE À RISQUE' : 'AUCUN RISQUE', techLevel);
    drawRiskBadge(cover, startX + badgeW + gap, curY, badgeW, 'Catastrophes naturelles', `${r.nbCatnat || 0} arrêté(s)`, (r.nbCatnat || 0) > 10 ? 'orange' : 'green');
    const bruitLevel = r.bruitAerodrome ? 'orange' : 'green';
    drawRiskBadge(cover, startX + 2 * (badgeW + gap), curY, badgeW - 15, 'Bruit aérodrome', r.bruitAerodrome ? 'ZONE EXPOSÉE' : 'Non concerné', bruitLevel);

    curY -= 60;
    // Ligne 3 — nouveaux risques v5
    const sisLevel  = r.sisConcerne ? 'red' : 'green';
    const icpeLevel = r.icpeConcerne ? 'orange' : 'green';
    const mvtLevel  = r.mvtConcerne ? 'orange' : 'green';
    drawRiskBadge(cover, startX, curY, badgeW, 'Pollution des sols (SIS)', r.sisConcerne ? 'SITE IDENTIFIÉ' : 'Non concerné', sisLevel);
    drawRiskBadge(cover, startX + badgeW + gap, curY, badgeW, 'Installations classées', r.icpeConcerne ? `${r.icpeProximite?.length || '?'} site(s)` : 'Non concerné', icpeLevel);
    drawRiskBadge(cover, startX + 2 * (badgeW + gap), curY, badgeW - 15, 'Mouvements de terrain', r.mvtConcerne ? 'ZONE À RISQUE' : 'Non concerné', mvtLevel);

    curY -= 60;
    drawRiskBadge(cover, startX, curY, badgeW, 'Cavités souterraines', r.cavitesConcerne ? 'ZONE À RISQUE' : 'Non concerné', r.cavitesConcerne ? 'orange' : 'green');
    // Année de construction
    const anneeLevel = r.anneeConstruction && r.anneeConstruction !== 'Non recensée' ? 'gray' : 'gray';
    drawRiskBadge(cover, startX + badgeW + gap, curY, badgeW, 'Année de construction', r.anneeConstruction || 'Non recensée', anneeLevel);
    // PLU
    drawRiskBadge(cover, startX + 2 * (badgeW + gap), curY, badgeW - 15, 'Zone PLU', r.zonePLU || 'Non déterminée', 'gray');

    // ── Pied de page couverture ──
    curY -= 50;
    cover.drawRectangle({ x: 25, y: curY - 5, width: PAGE_W - 50, height: 40, color: GRIS_F });
    cover.drawText('Document généré automatiquement par Géodiag — données officielles de l\'État', {
      x: 35, y: curY + 20, size: 7.5, font: helvetica, color: GRIS,
    });
    cover.drawText('Les informations sur les risques sont disponibles sur georisques.gouv.fr · geoportail-urbanisme.gouv.fr', {
      x: 35, y: curY + 8, size: 7, font: helvetica, color: GRIS,
    });
    cover.drawText(`Rapport généré le ${today}  ·  Valable 6 mois pour la vente ou la location`, {
      x: 35, y: curY - 3, size: 7, font: helveticaBold, color: BLEU,
    });

    // Numéro de page
    cover.drawText('1', { x: PAGE_W / 2, y: 20, size: 8, font: helvetica, color: GRIS });

    // ══════════════════════════════════════════════════════════════════════════
    // PAGES CERFA — Copie depuis le template + overlay données réelles
    // ══════════════════════════════════════════════════════════════════════════
    // Le template contient 14 pages :
    //   [0] Cover france-erp (on la remplace par notre cover)
    //   [1] Plans de Prévention (page utile)
    //   [2] Formulaire CERFA État des Risques (page clé à annoter)
    //   [3] Suite CERFA : sismicité, radon, signatures (page clé à annoter)
    //   [4] ENSA (bruit aérien — page à annoter)
    //   [5-13] Annexes cartographiques (copiées telles quelles)

    // Copier les pages 1 à 13 (index 1-13, en sautant la cover france-erp index 0)
    const templatePages = await pdfDoc.copyPages(templateDoc, Array.from({ length: 13 }, (_, i) => i + 1));

    // ── Page CERFA "État des Risques" (index 1 dans templatePages = page template [2]) ──
    const cerfaPage1 = templatePages[1]; // page template index 2

    // White-out zone adresse (top≈79 → 115, x: 30-290)
    whiteOut(cerfaPage1, 30, 79, 275, 35);
    // Écrire la nouvelle adresse
    cerfaPage1.drawText(truncate(adresse, 50), {
      x: 39, y: yFromTop(93), size: 8.5, font: helveticaBold, color: NOIR,
    });

    // White-out code postal (x: 295-395, top: 85-105)
    whiteOut(cerfaPage1, 295, 85, 110, 22);
    cerfaPage1.drawText(`${insee.substring(0, 5)} (${insee})`, {
      x: 304, y: yFromTop(99), size: 8.5, font: helvetica, color: NOIR,
    });

    // White-out commune (x: 400-560, top: 85-105)
    whiteOut(cerfaPage1, 400, 85, 160, 22);
    cerfaPage1.drawText(city, {
      x: 410, y: yFromTop(99), size: 8.5, font: helvetica, color: NOIR,
    });

    // ── Checkbox PPRN (Oui/Non) — position top≈144 ──
    // White-out existing X at x=540-560, top=138-152
    whiteOut(cerfaPage1, 540, 137, 20, 18);
    // Si inondation → cocher Oui (x≈510, top≈144), sinon Non (x≈548)
    const pprnX = r.inondation ? 510 : 548;
    cerfaPage1.drawText('X', { x: pprnX, y: yFromTop(148), size: 9, font: helveticaBold, color: NOIR });

    // ── Checkbox PPRM — position top≈249 (Risques miniers) ──
    // Chercher le X existant pour PPRM et l'effacer
    whiteOut(cerfaPage1, 540, 242, 20, 18);
    // Généralement Non pour les risques miniers
    cerfaPage1.drawText('X', { x: 548, y: yFromTop(253), size: 9, font: helveticaBold, color: NOIR });

    // ── Checkbox PPRT — position top≈328 (Risques technologiques) ──
    whiteOut(cerfaPage1, 540, 321, 20, 18);
    const pprtX = r.technologique ? 510 : 548;
    cerfaPage1.drawText('X', { x: pprtX, y: yFromTop(332), size: 9, font: helveticaBold, color: NOIR });

    // ── Page CERFA suite (index 2 dans templatePages = page template [3]) ──
    const cerfaPage2 = templatePages[2]; // page template index 3

    // ── Zone sismique : white-out le X existant (Zone 1, x≈99-115, top≈65-80) ──
    whiteOut(cerfaPage2, 95, 64, 20, 18);

    // Déterminer la zone sismique (1-5) depuis le texte
    let zoneNum = 1;
    const sismMatch = r.sismicite?.match(/Zone\s*(\d)/i);
    if (sismMatch) zoneNum = parseInt(sismMatch[1]);
    // Positions X des cases zones (approximations basées sur form_structure)
    const zoneCheckboxX: Record<number, number> = { 1: 102, 2: 205, 3: 312, 4: 418, 5: 521 };
    const targetZoneX = zoneCheckboxX[zoneNum] || zoneCheckboxX[1];
    cerfaPage2.drawText('X', { x: targetZoneX, y: yFromTop(76), size: 9, font: helveticaBold, color: NOIR });

    // ── Radon : white-out le X existant (x≈545, top≈107-120) ──
    whiteOut(cerfaPage2, 540, 106, 20, 18);
    // Potentiel radon : si catégorie 3 → Oui, sinon Non
    const radonOui = r.potentielRadon?.includes('3');
    const radonCheckX = radonOui ? 510 : 548;
    cerfaPage2.drawText('X', { x: radonCheckX, y: yFromTop(117), size: 9, font: helveticaBold, color: NOIR });

    // ── OLD : white-out X existant (x≈545, top≈144-158) ──
    whiteOut(cerfaPage2, 540, 143, 20, 18);
    // Généralement Non
    cerfaPage2.drawText('X', { x: 548, y: yFromTop(154), size: 9, font: helveticaBold, color: NOIR });

    // ── SIS Pollution sols ──
    // Position "Le terrain est situé en secteur d'information..." top≈187
    // Le text avec l'info SIS est déjà dans le template — on ajoute juste la donnée si nécessaire

    // ── Signatures (bas de page 4) ──
    // White-out vendeur/acquéreur et date (top≈485-535)
    whiteOut(cerfaPage2, 30, 485, 180, 50);   // Vendeur
    whiteOut(cerfaPage2, 200, 485, 180, 50);   // Date/Lieu
    whiteOut(cerfaPage2, 385, 485, 180, 50);   // Acquéreur

    // Écrire "Voir contrat" et la date
    cerfaPage2.drawText('(Vendeur)', { x: 40, y: yFromTop(498), size: 8, font: helvetica, color: GRIS });
    cerfaPage2.drawText(today, { x: 215, y: yFromTop(498), size: 9, font: helveticaBold, color: NOIR });
    cerfaPage2.drawText(city, { x: 215, y: yFromTop(530), size: 8, font: helvetica, color: NOIR });
    cerfaPage2.drawText('(Acquéreur)', { x: 400, y: yFromTop(498), size: 8, font: helvetica, color: GRIS });

    // ── Page ENSA (index 3 dans templatePages = page template [4]) ──
    const ensaPage = templatePages[3]; // page template index 4

    // White-out adresse existante dans ENSA (approximatif top≈85-105)
    whiteOut(ensaPage, 30, 79, 275, 25);
    ensaPage.drawText(truncate(adresse, 50), {
      x: 35, y: yFromTop(95), size: 8, font: helveticaBold, color: NOIR,
    });
    // White-out code postal ENSA
    whiteOut(ensaPage, 290, 79, 120, 25);
    ensaPage.drawText(`${insee.substring(0, 5)} (${insee})`, {
      x: 295, y: yFromTop(95), size: 8, font: helvetica, color: NOIR,
    });
    // White-out commune ENSA
    whiteOut(ensaPage, 430, 79, 130, 25);
    ensaPage.drawText(city, { x: 435, y: yFromTop(95), size: 8, font: helvetica, color: NOIR });

    // ── Ajouter toutes les pages copiées au document final ──
    for (const page of templatePages) {
      pdfDoc.addPage(page);
    }

    // ── Numérotation (optionnelle — on numérote les pages ajoutées) ──
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const pg = pdfDoc.getPage(i);
      pg.drawText(`${i + 1} / ${totalPages}`, {
        x: PAGE_W - 55, y: 15, size: 7, font: helvetica, color: GRIS,
      });
    }

    // ── 4. Sérialiser et retourner ──────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();

    console.log(`📄 [ERP-PDF] PDF généré : ${totalPages} pages, ${(pdfBytes.length / 1024).toFixed(0)} Ko`);

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ERP_${city.replace(/\s+/g, '_')}_${today.replace(/\//g, '-')}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('🔥 [ERP-PDF] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF.', details: String(error) },
      { status: 500 }
    );
  }
}
