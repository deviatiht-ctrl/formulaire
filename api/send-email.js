// api/send-email.js — Vercel Serverless Function (CommonJS)
const https = require('https');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const RESEND_KEY = process.env.RESEND_API_KEY || 're_3fzBXEVJ_5xcYX4bahNNtizCWcFdkuymS';
    const body = JSON.stringify(req.body);

    const result = await new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + RESEND_KEY,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try { resolve({ status: response.statusCode, body: JSON.parse(data) }); }
                catch(e) { resolve({ status: response.statusCode, body: { raw: data } }); }
            });
        });
        request.on('error', reject);
        request.write(body);
        request.end();
    });

    return res.status(result.status).json(result.body);
};
