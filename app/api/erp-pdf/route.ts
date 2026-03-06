import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat     = searchParams.get('lat');
  const lon     = searchParams.get('lon');
  const insee   = searchParams.get('insee');
  const city    = searchParams.get('city');
  const adresse = searchParams.get('adresse');

  if (!lat || !lon || !insee || !adresse) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  // ── URL officielle Géorisques PDF ────────────────────────────────────────
  const params = new URLSearchParams({
    'form-adresse':   'true',
    isCadastre:       'false',
    city:             city || '',
    type:             'housenumber',
    typeForm:         'adresse',
    codeInsee:        insee,
    lon,
    lat,
    'go_back':        '/',
    propertiesType:   'housenumber',
    adresse,
  });

  const urlGeorisques = `https://www.georisques.gouv.fr/ajax/mes-risques/rapport-pdf/generation-fichier?${params.toString()}`;

  console.log('📄 Génération PDF Géorisques :', urlGeorisques);

  try {
    const res = await fetch(urlGeorisques, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Referer':    'https://www.georisques.gouv.fr/',
        'Accept':     'application/pdf,*/*',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('❌ Géorisques PDF error:', res.status, await res.text().catch(() => ''));
      return NextResponse.json({ error: 'PDF non disponible depuis Géorisques.' }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || 'application/pdf';

    // Si Géorisques retourne d'abord un JSON avec une URL de téléchargement
    if (contentType.includes('application/json')) {
      const json = await res.json();
      console.log('📄 Réponse JSON Géorisques:', json);

      // Certaines versions retournent { url: '...' } ou { fichier: '...' }
      const pdfUrl = json.url || json.fichier || json.download_url;
      if (pdfUrl) {
        const fullUrl = pdfUrl.startsWith('http') ? pdfUrl : `https://www.georisques.gouv.fr${pdfUrl}`;
        const pdfRes = await fetch(fullUrl, {
          headers: { 'Referer': 'https://www.georisques.gouv.fr/' },
        });
        if (pdfRes.ok) {
          const pdfBuffer = await pdfRes.arrayBuffer();
          return new Response(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="ERP-${encodeURIComponent(adresse)}.pdf"`,
            },
          });
        }
      }
      return NextResponse.json({ error: 'URL PDF introuvable dans la réponse.', debug: json }, { status: 502 });
    }

    // Cas direct : Géorisques retourne le PDF binaire
    const pdfBuffer = await res.arrayBuffer();
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ERP-Georisques.pdf"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('🔥 Erreur proxy PDF:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du PDF.' }, { status: 500 });
  }
}
