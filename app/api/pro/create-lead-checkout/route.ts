import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const body = await request.json();
  const { leadId, commune } = body;

  if (!leadId) {
    return NextResponse.json({ error: 'leadId manquant.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
  }

  // Vérifier que le lead existe
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, adresse, type_projet, type_bien')
    .eq('id', leadId)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead introuvable.' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = `${appUrl}/pro/lead-success?session_id={CHECKOUT_SESSION_ID}&lead_id=${leadId}`;
  const cancelUrl  = `${appUrl}/pro/dashboard`;

  const formBody = new URLSearchParams({
    'mode':                                           'payment',
    'success_url':                                    successUrl,
    'cancel_url':                                     cancelUrl,
    'line_items[0][price_data][currency]':            'eur',
    'line_items[0][price_data][unit_amount]':         '500',  // 5,00 €
    'line_items[0][price_data][product_data][name]':  `Lead — ${commune || 'Commune inconnue'}`,
    'line_items[0][price_data][product_data][description]': `${lead.type_projet || ''} · ${lead.type_bien || ''}`,
    'line_items[0][quantity]':                        '1',
    'metadata[lead_id]':                              leadId,
    'metadata[type]':                                 'lead_purchase',
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
    console.error('Erreur create-lead-checkout:', err);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
