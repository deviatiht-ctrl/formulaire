// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM = 'Rasin Ayiti <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function registrationHtml(prenom: string, nom: string, email: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:28px 32px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#fff;font-size:1.4rem;margin:0 0 4px;">RASIN AYITI × UNITECH</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">Séminaire sur les Compétences de Vie</p>
    </div>
    <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
      <h2 style="color:#1f2937;font-size:1.1rem;margin:0 0 16px;">Bonjour ${prenom} ${nom} 👋</h2>
      <p style="color:#4b5563;font-size:0.92rem;line-height:1.7;">
        Nous avons bien reçu votre inscription au <strong>Séminaire sur les Compétences de Vie</strong>.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:0.88rem;color:#166534;"><strong>📅 Date :</strong> 30 Avril et 1er Mai 2026</p>
        <p style="margin:0 0 8px;font-size:0.88rem;color:#166534;"><strong>🕘 Heure :</strong> 09:00 AM – 01:00 PM</p>
        <p style="margin:0;font-size:0.88rem;color:#166534;"><strong>💻 Format :</strong> 100% en ligne sur Zoom</p>
      </div>
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:0.88rem;color:#854d0e;">
          ⏳ <strong>Prochaine étape :</strong> Complétez votre paiement (500 Gds) pour confirmer votre place.
          Vous recevrez votre <strong>code d'accès Zoom</strong> et votre <strong>certificat</strong> après confirmation.
        </p>
      </div>
      <p style="color:#6b7280;font-size:0.82rem;">Email inscrit : ${email}</p>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:20px;">
      © 2026 Rasin Ayiti × UNITECH — +509 46807922
    </p>
  </div>`;
}

function confirmationHtml(prenom: string, nom: string, email: string, accessCode: string, zoomLink: string, zoomId: string, zoomPass: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:580px;margin:0 auto;background:#f8fafc;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#4f46e5,#16a34a);border-radius:16px;padding:28px 32px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#fff;font-size:1.4rem;margin:0 0 4px;">RASIN AYITI × UNITECH</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;margin:0;">Confirmation de Participation</p>
    </div>
    <div style="background:#fff;border-radius:12px;padding:28px 32px;border:1px solid #e5e7eb;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:60px;height:60px;line-height:60px;font-size:1.8rem;">✅</div>
        <h2 style="color:#1f2937;font-size:1.15rem;margin:12px 0 4px;">Paiement confirmé !</h2>
        <p style="color:#6b7280;font-size:0.88rem;margin:0;">Bienvenue ${prenom} ${nom}</p>
      </div>

      <div style="background:#f0f7ff;border:2px solid #4f46e5;border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
        <p style="font-size:0.78rem;color:#4f46e5;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Votre Code d'Accès</p>
        <div style="font-size:2rem;font-weight:900;color:#4f46e5;letter-spacing:0.2em;font-family:monospace;">${accessCode}</div>
        <p style="font-size:0.78rem;color:#6b7280;margin:8px 0 0;">À utiliser sur la page d'accès participant</p>
      </div>

      <div style="text-align:center;margin:16px 0;">
        <a href="https://deviatiht-ctrl.github.io/formulaire/access.html" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:0.92rem;">
          Accéder à ma formation →
        </a>
      </div>

      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px;">
        <p style="font-size:0.88rem;font-weight:700;color:#1f2937;margin:0 0 10px;">📹 Informations Zoom</p>
        <p style="font-size:0.88rem;color:#4b5563;margin:0 0 6px;"><strong>Lien :</strong> <a href="${zoomLink}" style="color:#4f46e5;">${zoomLink}</a></p>
        <p style="font-size:0.88rem;color:#4b5563;margin:0 0 6px;"><strong>Meeting ID :</strong> ${zoomId}</p>
        <p style="font-size:0.88rem;color:#4b5563;margin:0;"><strong>Mot de passe :</strong> ${zoomPass}</p>
      </div>

      <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-top:16px;font-size:0.82rem;color:#6b7280;">
        <p style="margin:0 0 4px;"><strong>📅 Date :</strong> 30 Avril et 1er Mai 2026</p>
        <p style="margin:0 0 4px;"><strong>🕘 Heure :</strong> 09:00 AM – 01:00 PM</p>
        <p style="margin:0;"><strong>📧 Email :</strong> ${email}</p>
      </div>
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:0.75rem;margin-top:20px;">
      © 2026 Rasin Ayiti × UNITECH — +509 46807922
    </p>
  </div>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, to, prenom, nom, email, access_code, zoom_link, zoom_id, zoom_pass } = body;

    let subject = '';
    let html = '';

    if (type === 'registration') {
      subject = '📋 Inscription reçue — Séminaire Compétences de Vie | Rasin Ayiti';
      html = registrationHtml(prenom, nom, to);
    } else if (type === 'confirmation') {
      subject = '✅ Paiement confirmé + Code d\'accès Zoom — Séminaire Rasin Ayiti';
      html = confirmationHtml(prenom, nom, to, access_code, zoom_link, zoom_id, zoom_pass);
    } else {
      return new Response(JSON.stringify({ error: 'Type inconnu' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
