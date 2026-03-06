import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { company, email } = body;

  if (!company || !email) {
    return NextResponse.json({ error: 'Paramètres manquants.' }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailReception = process.env.EMAIL_RECEPTION || 'geodiag75@proton.me';
  const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!resendKey) {
    return NextResponse.json({ error: 'Configuration email manquante.' }, { status: 500 });
  }

  const now = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8f9fa; border: 1px solid #e5e7eb;">
      <div style="background: #003189; padding: 16px 24px; margin-bottom: 24px;">
        <h1 style="color: white; font-size: 18px; margin: 0; font-weight: 900; letter-spacing: 1px;">GÉODIAG — NOUVELLE INSCRIPTION PRO</h1>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb;">
        <p style="color: #374151; font-size: 15px; margin-bottom: 20px;">Un nouveau professionnel vient de créer un compte sur l'espace pro Géodiag.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase; width: 40%;">Entreprise</td>
            <td style="padding: 10px 0; color: #111827; font-size: 15px; font-weight: bold;">${company}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 10px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Email</td>
            <td style="padding: 10px 0; color: #111827; font-size: 15px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 12px; font-weight: bold; text-transform: uppercase;">Date</td>
            <td style="padding: 10px 0; color: #111827; font-size: 13px;">${now}</td>
          </tr>
        </table>
        <div style="margin-top: 24px; padding: 12px 16px; background: #eff6ff; border-left: 4px solid #003189;">
          <p style="margin: 0; font-size: 13px; color: #1e40af;">Ce pro a accès au tableau de bord et peut acheter des crédits pour déverrouiller des leads.</p>
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 11px; margin-top: 16px; text-align: center;">Géodiag · Notification automatique</p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    emailFrom,
        to:      [emailReception],
        subject: `🆕 Nouveau pro inscrit : ${company}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error('Resend error (notify-signup):', err);
      // Ne pas bloquer l'inscription si l'email échoue
      return NextResponse.json({ sent: false, error: err });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Erreur notify-signup:', err);
    return NextResponse.json({ sent: false });
  }
}
