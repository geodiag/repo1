import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const leadId    = searchParams.get('lead_id');

  if (!sessionId || !leadId) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
  }

  // 1. Vérifier paiement Stripe
  const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  });

  if (!stripeRes.ok) {
    return NextResponse.json({ error: 'Session Stripe introuvable.' }, { status: 404 });
  }

  const session = await stripeRes.json();

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Paiement non complété.' }, { status: 402 });
  }

  if (session.metadata?.lead_id !== leadId) {
    return NextResponse.json({ error: 'Lead non correspondant.' }, { status: 403 });
  }

  // 2. Récupérer les données complètes du lead (avec service_role)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: lead, error } = await supabase
    .from('leads')
    .select('id, adresse, email, telephone, type_projet, type_bien')
    .eq('id', leadId)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: 'Lead introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ paid: true, lead });
}
