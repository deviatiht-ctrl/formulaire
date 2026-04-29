const crypto = require('crypto');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { meetingNumber, role } = req.body;
    const sdkKey    = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
        return res.status(500).json({ error: 'Zoom SDK credentials not configured. Set ZOOM_SDK_KEY and ZOOM_SDK_SECRET in Vercel env vars.' });
    }
    if (!meetingNumber) {
        return res.status(400).json({ error: 'meetingNumber is required' });
    }

    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        sdkKey,
        appKey: sdkKey,
        mn:     String(meetingNumber).replace(/\s/g, ''),
        role:   parseInt(role) || 0,
        iat,
        exp,
        tokenExp: exp
    })).toString('base64url');

    const signature = crypto
        .createHmac('sha256', sdkSecret)
        .update(`${header}.${payload}`)
        .digest('base64url');

    return res.status(200).json({
        signature: `${header}.${payload}.${signature}`,
        sdkKey
    });
};
