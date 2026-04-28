// api/send-email.js — Vercel Serverless Function
// Envoie via SendGrid API (gratuit 100/jour, pas de domaine requis)
const https = require('https');

const SENDGRID_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'rasinayiti.ht@gmail.com';

function sendgridRequest(body) {
    return new Promise((resolve, reject) => {
        if (!SENDGRID_KEY) return reject(new Error('SENDGRID_API_KEY manquant'));

        const data = JSON.stringify(body);
        const options = {
            hostname: 'api.sendgrid.com',
            path: '/v3/mail/send',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + SENDGRID_KEY,
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
                    reject(new Error('SendGrid error ' + res.statusCode + ': ' + responseData));
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
    if (!SENDGRID_KEY) {
        console.error('❌ SENDGRID_API_KEY manquant dans Environment Variables');
        return res.status(500).json({ error: 'SENDGRID_API_KEY non configuré dans Vercel. Allez dans Settings > Environment Variables.' });
    }

    const body = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'Rasin Ayiti × UNITECH' },
        subject: subject,
        content: [{ type: 'text/html', value: html }],
    };

    try {
        await sendgridRequest(body);
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
