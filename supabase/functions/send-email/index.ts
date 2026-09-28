// @ts-nocheck
// Supabase Edge Function — envoi d'emails via Brevo (réservé aux administrateurs).
// Secrets requis (Dashboard → Edge Functions → Secrets, ou `supabase secrets set`) :
//   BREVO_API_KEY  clé API v3 Brevo (préfixe xkeysib, PAS la clé SMTP au préfixe xsmtpsib)
//   FROM_EMAIL     expéditeur validé dans Brevo (Senders & IP)
//   FROM_NAME      nom affiché (optionnel)
// SUPABASE_URL et SUPABASE_ANON_KEY sont fournis automatiquement par Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'rasinayiti.ht@gmail.com';
const FROM_NAME = Deno.env.get('FROM_NAME') ?? 'Rasin Ayiti';
const MAX_MESSAGES = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sendOne({ to, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { email: FROM_EMAIL, name: FROM_NAME }, to: [{ email: to }], subject, htmlContent: html }),
  });
  if (res.ok) return { to, ok: true, messageId: (await res.json().catch(() => ({}))).messageId ?? null };
  const text = await res.text();
  let detail = text;
  try { detail = JSON.parse(text).message || text; } catch (_) { /* texte brut */ }
  return { to, ok: false, error: `Brevo ${res.status}: ${detail}` };
}

// Diagnostic de livraison : expéditeur validé ? compte actif ? que s'est-il passé pour cet email ?
async function brevoGet(path) {
  const res = await fetch('https://api.brevo.com/v3' + path, { headers: { 'api-key': BREVO_API_KEY, accept: 'application/json' } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${data.message || 'erreur'}`);
  return data;
}
async function diagnostic(email) {
  const out = { from: FROM_EMAIL, sender: null, account: null, events: [], errors: [] };
  try {
    const { senders = [] } = await brevoGet('/senders');
    const s = senders.find(x => String(x.email).toLowerCase() === FROM_EMAIL.toLowerCase());
    out.sender = s ? { email: s.email, active: !!s.active } : { email: FROM_EMAIL, active: false, missing: true };
  } catch (e) { out.errors.push('Expéditeurs : ' + e.message); }
  try {
    const a = await brevoGet('/account');
    out.account = { email: a.email, company: a.companyName, plan: (a.plan || []).map(p => `${p.type}${p.credits != null ? ' (' + p.credits + ' crédits)' : ''}`) };
  } catch (e) { out.errors.push('Compte : ' + e.message); }
  if (EMAIL_RE.test(email)) {
    try {
      const { events = [] } = await brevoGet(`/smtp/statistics/events?email=${encodeURIComponent(email)}&days=7&limit=30&sort=desc`);
      out.events = events.map(e => ({ date: e.date, event: e.event, reason: e.reason || '', subject: e.subject || '' }));
    } catch (e) { out.errors.push('Événements : ' + e.message); }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  if (!BREVO_API_KEY) return json({ error: 'BREVO_API_KEY non configuré dans les secrets Supabase.' }, 500);

  const authorization = req.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
  });
  const { data: isAdmin, error: adminError } = await supabase.rpc('rasinayiti_is_admin');
  if (adminError || isAdmin !== true) return json({ error: 'Session administrateur requise pour envoyer des emails.' }, 403);

  let body;
  try { body = await req.json(); } catch (_) { return json({ error: 'JSON invalide' }, 400); }
  if (body?.action === 'diagnostic') return json(await diagnostic(String(body.email ?? '').trim().toLowerCase()));
  const messages = Array.isArray(body?.messages) ? body.messages : [body];
  if (!messages.length || messages.length > MAX_MESSAGES) return json({ error: `Entre 1 et ${MAX_MESSAGES} emails par requête.` }, 400);

  const results = [];
  for (const m of messages) {
    const to = String(m?.to ?? '').trim().toLowerCase();
    const subject = String(m?.subject ?? '').trim();
    const html = String(m?.html ?? '');
    if (!EMAIL_RE.test(to)) { results.push({ to, ok: false, error: 'Email invalide' }); continue; }
    if (!subject || !html || subject.length > 250 || html.length > 200000) { results.push({ to, ok: false, error: 'Sujet ou contenu invalide' }); continue; }
    try { results.push(await sendOne({ to, subject, html })); }
    catch (e) { results.push({ to, ok: false, error: e.message }); }
  }
  const sent = results.filter(r => r.ok).length;
  return json({ success: sent > 0, sent, failed: results.length - sent, results });
});
