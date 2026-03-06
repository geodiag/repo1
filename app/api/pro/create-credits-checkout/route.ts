import { NextResponse } from 'next/server';

// Packs de crédits disponibles
export const CREDIT_PACKS = [
  { id: 'starter', label: 'Pack Starter',  credits: 5,  price: 2200, priceDisplay: '22 €',  perLead: '4,40 €/lead' },
  { id: 'pro',     label: 'Pack Pro',      credits: 15, price: 6000, priceDisplay: '60 €',  perLead: '4,00 €/lead' },
  { id: 'expert',  label: 'Pack Expert',   credits: 30, price: 10500, priceDisplay: '105 €', perLead: '3,50 €/lead' },
];

export async function POST(request: Request) {
  const body = await request.json();
  const { packId, proId } = body;

  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) {
    return NextResponse.json({ error: 'Pack invalide.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = `${appUrl}/pro/credits-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = `${appUrl}/pro/dashboard`;

  const formBody = new URLSearchParams({
    'mode':                                           'payment',
    'success_url':                                    successUrl,
    'cancel_url':                                     cancelUrl,
    'line_items[0][price_data][currency]':            'eur',
    'line_items[0][price_data][unit_amount]':         String(pack.price),
    'line_items[0][price_data][product_data][name]':  `${pack.label} — ${pack.credits} crédits`,
    'line_items[0][price_data][product_data][description]': `${pack.perLead} · Utilisables pour déverrouiller des leads`,
    'line_items[0][quantity]':                        '1',
    'metadata[pack_id]':                              pack.id,
    'metadata[credits]':                              String(pack.credits),
    'metadata[pro_id]':                               proId || '',
    'metadata[type]':                                 'credit_purchase',
    'payment_method_types[0]':                        'card',
    'locale':                                         'fr',
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
      return NextResponse.json({ error: err.error?.message || 'Erreur Stripe.' }, { status: 502 });
    }

    const session = await stripeRes.json();
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Erreur create-credits-checkout:', err);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
