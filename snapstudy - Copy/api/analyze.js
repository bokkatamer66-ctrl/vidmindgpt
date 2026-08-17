const https = require('https');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
    }

    const postData = JSON.stringify({
        contents: [{
            parts: [{ text: prompt || "Hello" }]
        }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (response.statusCode !== 200) {
                    return res.status(response.statusCode).json({ error: parsed.error?.message || 'Gemini API Error' });
                }
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return res.status(200).json({ result: text });
            } catch (e) {
                return res.status(500).json({ error: 'Invalid JSON response from Gemini' });
            }
        });
    });

    request.on('error', (error) => {
        return res.status(500).json({ error: error.message });
    });

    request.write(postData);
    request.end();
};
