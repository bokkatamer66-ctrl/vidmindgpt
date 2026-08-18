import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // =========================
  // 1. Allow POST only
  // =========================

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    // =========================
    // 2. Read request
    // =========================

    const body = req.body || {};

    const transcript =
      typeof body.transcript === "string"
        ? body.transcript.trim()
        : "";

    const mode = body.mode || "summary";

    // =========================
    // 3. Check transcript
    // =========================

    if (!transcript) {
      return res.status(400).json({
        ok: false,
        error:
          "No transcript was provided. Please provide the video transcript."
      });
    }

    // =========================
    // 4. Check Gemini API key
    // =========================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing on Vercel."
      });
    }

    // =========================
    // 5. Create Gemini client
    // =========================

    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    // =========================
    // 6. Build bilingual prompt
    // =========================

    let prompt;

    if (mode === "explain") {
      prompt = `
You are SnapGPT, an educational AI assistant.

Analyze the transcript below and explain it in TWO languages:
1. Arabic
2. English

The explanation must be based ONLY on the provided transcript.

========================
🇪🇬 ARABIC EXPLANATION
========================

اكتب شرحًا عربيًا واضحًا وسهلًا للطلاب.

استخدم هذا الترتيب:

العنوان:
الفكرة الرئيسية:

شرح مبسط:
- 
- 
- 

أهم النقاط:
- 
- 
- 

أمثلة مهمة:
- 

الخلاصة:


========================
🇬🇧 ENGLISH EXPLANATION
========================

Write a clear and student-friendly English explanation.

Use this structure:

Title:

Main Idea:

Simple Explanation:
-
-
-

Key Points:
-
-
-

Important Examples:

Conclusion:


========================
IMPORTANT RULES
========================

- Arabic and English must describe the SAME information.
- Do not invent facts.
- Do not add information that is not supported by the transcript.
- Remove repetition.
- Keep the explanation organized.
- Keep important educational details.
- Use simple language suitable for students.

TRANSCRIPT:
${transcript}
`;
    } else {
      prompt = `
You are SnapGPT, an educational AI assistant.

Summarize the transcript below in TWO languages:
1. Arabic
2. English

The two summaries must contain the SAME important information.

========================
🇪🇬 ARABIC SUMMARY
========================

العنوان:

ملخص سريع:

أهم النقاط:
- 
- 
- 
- 

أهم المعلومات التي يجب تذكرها:
- 
- 
- 

الخلاصة:


========================
🇬🇧 ENGLISH SUMMARY
========================

Title:

Quick Summary:

Key Points:
-
-
-
-

Important Information to Remember:
-
-
-

Conclusion:


========================
QUALITY RULES
========================

- Keep the Arabic and English summaries equivalent.
- Do not invent information.
- Do not assume information that is not in the transcript.
- Remove repetition and unnecessary speech.
- Keep important definitions, facts, examples, numbers and concepts.
- Organize the result clearly.
- Make it useful for studying.
- Use simple, natural Arabic.
- Use clear, natural English.

TRANSCRIPT:
${transcript}
`;
    }

    // =========================
    // 7. Send to Gemini
    // =========================

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt
    });

    const result = response.text;

    // =========================
    // 8. Check Gemini response
    // =========================

    if (!result || !result.trim()) {
      return res.status(500).json({
        ok: false,
        error: "Gemini returned an empty response."
      });
    }

    // =========================
    // 9. Return result
    // =========================

    return res.status(200).json({
      ok: true,
      result: result.trim(),
      mode: mode
    });

  } catch (error) {
    console.error("SNAPGPT ERROR:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "An unexpected error occurred while processing the AI request."
    });
  }
}
