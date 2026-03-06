import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id manquant.' }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Configuration Stripe manquante.' }, { status: 500 });
  }

  try {
    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
      },
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.json();
      console.error('❌ Stripe verify error:', err);
      return NextResponse.json({ error: 'Session introuvable.' }, { status: 404 });
    }

    const session = await stripeRes.json();

    // Vérifier que le paiement est bien validé
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false, status: session.payment_status }, { status: 402 });
    }

    // Retourner les métadonnées de l'adresse pour le téléchargement PDF
    return NextResponse.json({
      paid: true,
      metadata: session.metadata,
    });

  } catch (error) {
    console.error('🔥 Erreur verify-payment:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}
