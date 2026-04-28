// api/send-email.js — Vercel Serverless Function
// Envoie via Brevo API (ex-Sendinblue) - 300/jour gratuit
const https = require('https');

const BREVO_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'rasinayiti.ht@gmail.com';

function brevoRequest(body) {
    return new Promise((resolve, reject) => {
        if (!BREVO_KEY) return reject(new Error('BREVO_API_KEY manquant'));

        const data = JSON.stringify(body);
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'api-key': BREVO_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, status: res.statusCode });
                } else {
                    reject(new Error('Brevo error ' + res.statusCode + ': ' + responseData));
                }
            });
        });

        req.on('error', (e) => reject(new Error('Request error: ' + e.message)));
        req.write(data);
        req.end();
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'Champs manquants: to, subject, html' });
    }
    if (!BREVO_KEY) {
        console.error('❌ BREVO_API_KEY manquant dans Environment Variables');
        return res.status(500).json({ error: 'BREVO_API_KEY non configuré. Créez un compte sur brevo.com, générez une clé API, et ajoutez-la dans Vercel > Settings > Environment Variables.' });
    }

    const body = {
        sender: { email: FROM_EMAIL, name: 'Rasin Ayiti × UNITECH' },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
    };

    try {
        await brevoRequest(body);
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
