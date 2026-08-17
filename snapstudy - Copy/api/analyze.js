export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            ok: false,
            error: "Method Not Allowed"
        });
    }

    try {
        let body = req.body;

        // Handle stringified JSON safely
        if (typeof body === "string") {
            try {
                body = JSON.parse(body);
            } catch {
                return res.status(400).json({
                    ok: false,
                    error: "Invalid JSON body."
                });
            }
        }

        const { transcript, mode = "summary" } = body || {};

        // Validate transcript
        if (
            typeof transcript !== "string" ||
            !transcript.trim()
        ) {
            return res.status(400).json({
                ok: false,
                error: "من فضلك أرسل الـ transcript."
            });
        }

        if (transcript.trim().length < 20) {
            return res.status(400).json({
                ok: false,
                error: "الـ transcript قصير جدًا."
            });
        }

        // Get Gemini API key
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                ok: false,
                error: "GEMINI_API_KEY missing in Vercel."
            });
        }

        // Select the prompt
        let promptText;

        switch (String(mode).toLowerCase()) {
            case "explain":
                promptText = `
You are SnapGPT.

اشرح محتوى الفيديو التالي باللغة العربية بطريقة بسيطة وواضحة.

استخدم:
- عناوين واضحة
- شرح سهل
- أهم الأفكار
- أمثلة فقط إذا كانت مدعومة بالنص

لا تضف أي معلومات غير موجودة في الـ transcript.

الـ transcript:

${transcript}
`;
                break;

            case "full":
                promptText = `
You are SnapGPT.

حلل الـ transcript التالي باللغة العربية، وأعطِ:

1. ملخص سريع
2. أهم الأفكار
3. ملخص تفصيلي
4. أهم التفاصيل
5. شرح مبسط
6. أهم الخلاصات

كن دقيقًا ومنظمًا.
لا تخترع أي معلومات غير موجودة في النص.

الـ transcript:

${transcript}
`;
                break;

            case "summary":
            case "summarize":
            default:
                promptText = `
You are SnapGPT.

قم بتلخيص الـ transcript التالي باللغة العربية بطريقة واضحة ومنظمة.

أخرج:
- الفكرة الرئيسية
- أهم النقاط
- التفاصيل المهمة
- الخلاصة النهائية

احذف التكرار والكلام الزائد.
لا تخترع أي معلومات غير موجودة في النص.

الـ transcript:

${transcript}
`;
                break;
        }

        // Send request to Gemini
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: promptText
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        // Handle Gemini errors
        if (!response.ok) {
            console.error("Gemini API Error:", data);

            return res.status(response.status).json({
                ok: false,
                error:
                    data?.error?.message ||
                    "Gemini API Error."
            });
        }

        // Extract Gemini response
        const text =
            data?.candidates?.[0]?.content?.parts
                ?.map(part => part.text || "")
                .join("")
                .trim();

        if (!text) {
            return res.status(500).json({
                ok: false,
                error: "Gemini returned no result."
            });
        }

        // Successful response
        return res.status(200).json({
            ok: true,
            result: text
        });

    } catch (error) {
        console.error("Analyze Error:", error);

        return res.status(500).json({
            ok: false,
            error:
                error?.message ||
                "SnapGPT could not analyze the transcript."
        });
    }
}
