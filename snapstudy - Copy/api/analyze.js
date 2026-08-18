import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing on Vercel."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Reply with exactly: SnapGPT Gemini works!"
    });

    return res.status(200).json({
      ok: true,
      result: response.text
    });

  } catch (error) {
    console.error("REAL GEMINI ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || String(error)
    });
  }
}
