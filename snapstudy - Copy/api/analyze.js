const https = require("https");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Method Not Allowed"
        });
    }

    try {
        let body = req.body;

        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch (e) {
                return res.status(400).json({
                    ok: false,
                    error: "Invalid request body."
                });
            }
        }

        const { transcript, mode = "summary" } = body || {};

        if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
            return res.status(400).json({
                ok: false,
                error: "لم يتم العثور على الـTranscript."
            });
        }

        if (transcript.trim().length < 20) {
            return res.status(400).json({
                ok: false,
                error: "الـTranscript قصير جدًا."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                ok: false,
                error: "GEMINI_API_KEY غير موجود في Vercel Environment Variables."
            });
        }

        let systemPrompt;

        switch (String(mode).toLowerCase()) {
            case "summary":
            case "summarize":
                systemPrompt = `
You are SnapGPT, an intelligent video-analysis assistant.

Summarize the following video transcript clearly and accurately.

Include:
- Main idea
- Important points
- Key details
- Final takeaway

Remove repetition and filler.
Do not invent information.

Answer in clear Arabic.

Transcript:
${transcript}
`;
                break;

            case "explain":
                systemPrompt = `
You are SnapGPT.

Explain the following video transcript in simple Arabic.

Use:
- Clear sections
- Simple explanations
- Important concepts
- Examples only when supported by the transcript

Do not invent information.

Transcript:
${transcript}
`;
                break;

            case "full":
            case "upload":
            default:
                systemPrompt = `
You are SnapGPT, an intelligent video-analysis assistant.

Analyze the following transcript and provide:

1. Quick Summary
2. Key Ideas
3. Detailed Summary
4. Important Details
5. Simple Explanation
6. Main Takeaways

Be accurate, organized and concise.
Do not invent information.

Answer in clear Arabic.

Transcript:
${transcript}
`;
                break;
        }

        const postData = JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: systemPrompt
                        }
                    ]
                }
            ]
        });

        const options = {
            hostname: "generativelanguage.googleapis.com",

            path: `/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData)
            }
        };

        const request = https.request(options, (response) => {
            let data = "";

            response.on("data", (chunk) => {
                data += chunk;
            });

            response.on("end", () => {
                try {
                    const parsed = JSON.parse(data);

                    if (response.statusCode < 200 || response.statusCode >= 300) {
                        console.error("Gemini API Error:", parsed);

                        return res.status(response.statusCode).json({
                            ok: false,
                            error:
                                parsed?.error?.message ||
                                "Gemini API Error."
                        });
                    }

                    const resultText =
                        parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!resultText) {
                        return res.status(500).json({
                            ok: false,
                            error: "Gemini returned no text."
                        });
                    }

                    return res.status(200).json({
                        ok: true,
                        result: resultText
                    });

                } catch (error) {
                    console.error("Gemini Response Error:", error);

                    return res.status(500).json({
                        ok: false,
                        error: "Failed to process Gemini response."
                    });
                }
            });
        });

        request.on("error", (error) => {
            console.error("Gemini Request Error:", error);

            return res.status(500).json({
                ok: false,
                error: error.message || "Gemini request failed."
            });
        });

        request.write(postData);
        request.end();

    } catch (error) {
        console.error("SnapGPT Server Error:", error);

        return res.status(500).json({
            ok: false,
            error:
                error?.message ||
                "SnapGPT could not analyze the transcript."
        });
    }
};
