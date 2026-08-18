export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method Not Allowed"
      });
    }

    const body = req.body || {};
    const transcript =
      typeof body.transcript === "string"
        ? body.transcript.trim()
        : "";

    const mode = body.mode || "summary";

    if (!transcript) {
      return res.status(400).json({
        ok: false,
        error: "No transcript was provided."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing."
      });
    }

    const prompt = mode === "explain"
      ? `
You are SnapGPT, an educational AI assistant.

Explain the following transcript in BOTH Arabic and English.

ARABIC:
- العنوان
- الفكرة الرئيسية
- شرح مبسط
- أهم النقاط
- الخلاصة

ENGLISH:
- Title
- Main Idea
- Simple Explanation
- Key Points
- Conclusion

Rules:
- Both languages must contain the same important information.
- Do not invent information.
- Use only the transcript.
- Make it easy for students to study.

TRANSCRIPT:
${transcript}
`
      : `
You are SnapGPT, an educational AI assistant.

Create a study summary of the following transcript in BOTH Arabic and English.

ARABIC SUMMARY:
العنوان:
ملخص سريع:
أهم النقاط:
- 
- 
- 
أهم المعلومات:
الخلاصة:

ENGLISH SUMMARY:
Title:
Quick Summary:
Key Points:
-
-
-
Important Information:
Conclusion:

Rules:
- Arabic and English must contain the same important information.
- Do not invent information.
- Keep important facts, definitions, examples and numbers.
- Remove repetition.
- Make it clear and useful for students.

TRANSCRIPT:
${transcript}
`;

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
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
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return res.status(200).json({
        ok: false,
        error:
          data?.error?.message ||
          "Gemini API request failed.",
        code: data?.error?.code || geminiResponse.status
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!result) {
      return res.status(200).json({
        ok: false,
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      ok: true,
      result: result.trim()
    });

  } catch (error) {
    console.error("SnapGPT Error:", error);

    return res.status(200).json({
      ok: false,
      error: error?.message || "Unexpected server error."
    });
  }
}
