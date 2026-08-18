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
You are SnapGPT, a professional educational AI assistant.

Explain the transcript below in BOTH Arabic and English.

IMPORTANT:
- Use ONLY information from the transcript.
- Never invent facts.
- Keep important definitions, facts, examples, names, dates, and numbers.
- Make the explanation easy for students.
- Arabic and English must contain the same important information.
- Use clear headings and bullet points.
- Add appropriate emojis to make the result engaging, but do not overuse them.

🇪🇬 ARABIC EXPLANATION

🎯 العنوان:
Write a clear title.

🧠 الفكرة الرئيسية:
Explain the main idea simply.

📚 شرح مبسط:
Explain the lesson in an easy student-friendly way.

🔥 أهم النقاط:
- Point 1
- Point 2
- Point 3

💡 معلومات مهمة:
Mention important definitions, facts, examples, dates or numbers.

📝 الخلاصة:
Give a short conclusion.

🇬🇧 ENGLISH EXPLANATION

🎯 Title:
Write a clear title.

🧠 Main Idea:
Explain the main idea simply.

📚 Simple Explanation:
Explain the lesson in an easy student-friendly way.

🔥 Key Points:
- Point 1
- Point 2
- Point 3

💡 Important Information:
Mention important definitions, facts, examples, dates or numbers.

📝 Conclusion:
Give a short conclusion.

TRANSCRIPT:
${transcript}
`
  : `
You are SnapGPT, a professional educational AI assistant.

Create a high-quality study summary of the transcript below in BOTH Arabic and English.

IMPORTANT:
- Use ONLY information from the transcript.
- Never invent information.
- Keep important facts, definitions, examples, names, dates, and numbers.
- Remove repetition.
- Make it concise but complete.
- Arabic and English must contain the same important information.
- Use clear headings and bullet points.
- Add appropriate emojis, but do not overuse them.

🇪🇬 ARABIC SUMMARY

🎯 العنوان:
Write a clear title.

⚡ ملخص سريع:
Give a concise overview.

🔥 أهم النقاط:
- Point 1
- Point 2
- Point 3

💡 أهم المعلومات:
Include important facts, definitions, examples, dates and numbers.

📝 الخلاصة:
Give a short study conclusion.

🇬🇧 ENGLISH SUMMARY

🎯 Title:
Write a clear title.

⚡ Quick Summary:
Give a concise overview.

🔥 Key Points:
- Point 1
- Point 2
- Point 3

💡 Important Information:
Include important facts, definitions, examples, dates and numbers.

📝 Conclusion:
Give a short study conclusion.

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
