// api/send-email.js — Vercel Serverless Function
// Envoie via Gmail SMTP (nodemailer) — pas de domaine nécessaire
const nodemailer = require('nodemailer');

const GMAIL_USER = process.env.GMAIL_USER || 'rasinayiti.ht@gmail.com';
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || '';

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

    if (!GMAIL_PASS) {
        return res.status(500).json({ error: 'GMAIL_APP_PASSWORD non configuré dans Vercel' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER, pass: GMAIL_PASS },
        });

        const info = await transporter.sendMail({
            from: `"Rasin Ayiti × UNITECH" <${GMAIL_USER}>`,
            to,
            subject,
            html,
        });

        return res.status(200).json({ success: true, messageId: info.messageId });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
