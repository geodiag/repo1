import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialisation du client Supabase côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(process.env.RESEND_API_KEY);

// Adresse email de réception des leads (à modifier selon vos besoins)
const EMAIL_RECEPTION = process.env.EMAIL_RECEPTION || 'contact@geodiag.fr';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@geodiag.fr';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { adresse, type_projet, type_bien, email, telephone } = body;

    // 1. Insertion dans la base de données Supabase
    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          adresse,
          type_projet,
          type_bien,
          email,
          telephone,
          statut: 'nouveau'
        }
      ])
      .select();

    if (error) throw error;

    // 2. Envoi de l'email de notification (interne) via Resend
    await resend.emails.send({
      from: `Géodiag Leads <${EMAIL_FROM}>`,
      to: EMAIL_RECEPTION,
      subject: `🏠 Nouveau lead — ${adresse}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #000091; padding: 20px 24px;">
            <h1 style="color: white; margin: 0; font-size: 18px;">📋 Nouveau lead Géodiag</h1>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-weight: bold; color: #6b7280; width: 40%;">Adresse</td>
                <td style="padding: 10px 0; color: #111827;">${adresse}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-weight: bold; color: #6b7280;">Projet</td>
                <td style="padding: 10px 0; color: #111827; text-transform: capitalize;">${type_projet}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-weight: bold; color: #6b7280;">Type de bien</td>
                <td style="padding: 10px 0; color: #111827; text-transform: capitalize;">${type_bien}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-weight: bold; color: #6b7280;">Email</td>
                <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #000091;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #6b7280;">Téléphone</td>
                <td style="padding: 10px 0;"><a href="tel:${telephone}" style="color: #000091;">${telephone}</a></td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 13px; color: #166534;">
              ✅ Lead enregistré en base de données. Pensez à rappeler le client sous 20 minutes.
            </div>
          </div>
          <div style="background: #f9fafb; padding: 14px 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
            Géodiag SaaS — 92 rue du Moulin Vert, 75014 Paris
          </div>
        </div>
      `,
    });

    // 3. Email de confirmation au client
    await resend.emails.send({
      from: `Géodiag <${EMAIL_FROM}>`,
      to: email,
      subject: `✅ Votre demande de devis a bien été reçue`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #000091; padding: 20px 24px;">
            <h1 style="color: white; margin: 0; font-size: 18px;">Géodiag — Diagnostics Immobiliers</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="font-size: 20px; color: #111827; margin-top: 0;">Votre demande est confirmée ✅</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Bonjour,<br><br>
              Nous avons bien reçu votre demande de devis pour le bien situé au :<br>
              <strong style="color: #000091;">${adresse}</strong>
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Un expert diagnostiqueur certifié de votre secteur vous contactera dans les <strong>20 minutes</strong> au numéro que vous avez indiqué.
            </p>
            <div style="margin: 24px 0; padding: 16px; background: #eff6ff; border-left: 4px solid #000091; border-radius: 0 6px 6px 0;">
              <p style="margin: 0; font-size: 13px; color: #1e3a8a; font-weight: bold;">📋 Récapitulatif de votre demande</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #374151;">
                Projet : <strong>${type_projet}</strong> · Type : <strong>${type_bien}</strong>
              </p>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
              Si vous avez des questions, répondez directement à cet email.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 14px 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
            Géodiag SaaS — 92 rue du Moulin Vert, 75014 Paris · Ce n'est pas un site gouvernemental.
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, lead: data });

  } catch (error) {
    console.error('Erreur lors de la création du lead:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la sauvegarde du lead.' },
      { status: 500 }
    );
  }
}