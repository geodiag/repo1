import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id manquant.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Configuration manquante.' }, { status: 500 });
  }

  // 1. Vérifier paiement Stripe
  const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  });

  if (!stripeRes.ok) {
    return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
  }

  const session = await stripeRes.json();

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Paiement non complété.' }, { status: 402 });
  }

  if (session.metadata?.type !== 'credit_purchase') {
    return NextResponse.json({ error: 'Type de session invalide.' }, { status: 400 });
  }

  const credits = parseInt(session.metadata.credits || '0');
  const proId   = session.metadata.pro_id;

  if (!credits || !proId) {
    return NextResponse.json({ error: 'Données manquantes.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Vérifier que cette session n'a pas déjà été créditée (idempotence)
  const { data: existing } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('stripe_session_id', sessionId)
    .single();

  if (existing) {
    // Déjà crédité — retourner le solde actuel sans recréditer
    const { data: profile } = await supabase
      .from('pro_profiles')
      .select('credits')
      .eq('id', proId)
      .single();
    return NextResponse.json({ credits: profile?.credits || 0, alreadyCredited: true });
  }

  // 3. Ajouter les crédits au profil
  const { data: profile } = await supabase
    .from('pro_profiles')
    .select('credits')
    .eq('id', proId)
    .single();

  const newBalance = (profile?.credits || 0) + credits;

  await supabase
    .from('pro_profiles')
    .upsert({ id: proId, credits: newBalance });

  // 4. Enregistrer la transaction
  await supabase.from('credit_transactions').insert({
    pro_id:            proId,
    amount:            credits,
    description:       `Achat ${session.metadata.pack_id} — ${credits} crédits`,
    stripe_session_id: sessionId,
  });

  return NextResponse.json({ credits: newBalance, added: credits });
}
