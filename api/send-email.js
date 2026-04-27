// api/send-email.js — Vercel Serverless Function
// Appelle Resend côté serveur → pas de CORS, pas de domaine nécessaire

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const RESEND_KEY = process.env.RESEND_API_KEY || 're_3fzBXEVJ_5xcYX4bahNNtizCWcFdkuymS';

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + RESEND_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        const data = await response.json();
        return res.status(response.status).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
