import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { lat, lon, insee, city, adresse } = body;

  if (!lat || !lon || !insee || !adresse) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Paramètres PDF encodés dans success_url pour le récupérer après paiement
  const pdfParams = new URLSearchParams({ lat, lon, insee, city: city || '', adresse });
  const successUrl = `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&${pdfParams.toString()}`;
  const cancelUrl  = `${appUrl}/?annule=1`;

  // Création de la session Stripe via l'API REST (sans SDK)
  const formBody = new URLSearchParams({
    'mode':                                           'payment',
    'success_url':                                    successUrl,
    'cancel_url':                                     cancelUrl,
    'line_items[0][price_data][currency]':            'eur',
    'line_items[0][price_data][unit_amount]':         '990',   // 9,90 €
    'line_items[0][price_data][product_data][name]':  'État des Risques et Pollutions (ERP)',
    'line_items[0][price_data][product_data][description]': `Rapport officiel certifié — ${adresse}`,
    'line_items[0][quantity]':                        '1',
    // Métadonnées pour retrouver les paramètres PDF après paiement
    'metadata[lat]':    lat,
    'metadata[lon]':    lon,
    'metadata[insee]':  insee,
    'metadata[city]':   city || '',
    'metadata[adresse]': adresse,
    // Pré-remplir l'email si possible
    'payment_method_types[0]': 'card',
    'locale': 'fr',
  });

  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      console.error('❌ Stripe error:', err);
      return NextResponse.json({ error: err.error?.message || 'Erreur Stripe.' }, { status: 502 });
    }

    const session = await stripeRes.json();
    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('🔥 Erreur create-checkout:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
