import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const body = await request.json();
  const { leadId, proId } = body;

  if (!leadId || !proId) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Vérifier que ce lead n'est pas déjà acheté par ce pro
  const { data: existingPurchase } = await supabase
    .from('lead_purchases')
    .select('id')
    .eq('pro_id', proId)
    .eq('lead_id', leadId)
    .single();

  if (existingPurchase) {
    // Déjà acheté — retourner les données sans déduire
    const { data: lead } = await supabase
      .from('leads')
      .select('id, adresse, email, telephone, type_projet, type_bien')
      .eq('id', leadId)
      .single();
    return NextResponse.json({ success: true, lead, alreadyOwned: true });
  }

  // 2. Vérifier le solde de crédits
  const { data: profile } = await supabase
    .from('pro_profiles')
    .select('credits')
    .eq('id', proId)
    .single();

  if (!profile || profile.credits < 1) {
    return NextResponse.json({ error: 'Crédits insuffisants.', credits: profile?.credits || 0 }, { status: 402 });
  }

  // 3. Récupérer les données du lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, adresse, email, telephone, type_projet, type_bien')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead introuvable.' }, { status: 404 });
  }

  // 4. Déduire 1 crédit (atomic update)
  const { error: updateError } = await supabase
    .from('pro_profiles')
    .update({ credits: profile.credits - 1 })
    .eq('id', proId)
    .eq('credits', profile.credits); // optimistic lock

  if (updateError) {
    return NextResponse.json({ error: 'Erreur lors de la déduction du crédit.' }, { status: 500 });
  }

  // 5. Enregistrer l'achat et la transaction
  await Promise.all([
    supabase.from('lead_purchases').insert({
      pro_id:  proId,
      lead_id: leadId,
    }),
    supabase.from('credit_transactions').insert({
      pro_id:      proId,
      amount:      -1,
      description: `Déverrouillage lead — ${lead.adresse?.split(',').pop()?.trim() || 'commune'}`,
    }),
  ]);

  return NextResponse.json({
    success: true,
    lead,
    creditsRemaining: profile.credits - 1,
  });
}
