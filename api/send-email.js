// api/send-email.js — DÉSACTIVÉ.
// Cette route Vercel acceptait des requêtes sans authentification (n'importe qui pouvait
// envoyer des emails avec le compte Brevo). Les emails passent désormais par la
// Supabase Edge Function "send-email" (supabase/functions/send-email/index.ts),
// réservée aux administrateurs connectés. La clé BREVO_API_KEY doit être configurée
// dans les secrets Supabase, et peut être retirée des variables d'environnement Vercel.
module.exports = function handler(req, res) {
    res.status(410).json({ error: 'Route désactivée : utilisez la fonction Supabase send-email (admin).' });
};
