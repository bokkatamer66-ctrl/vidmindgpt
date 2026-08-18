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
        error: "GEMINI_API_KEY is missing."
      });
    }

    const { videoUrl, mode = "summary" } = req.body || {};

    if (!videoUrl) {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey
    });

    const prompt =
      mode === "explain"
        ? `The user provided this YouTube video URL: ${videoUrl}

Explain what this video is likely about in Arabic. Be clear that you are working from the URL only and do not invent specific video content.`
        : `The user provided this YouTube video URL: ${videoUrl}

Return a short Arabic response confirming that SnapGPT's Gemini AI connection is working. Do not pretend that you watched or analyzed the video.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const result = response.text;

    if (!result) {
      return res.status(500).json({
        ok: false,
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      ok: true,
      result: result.trim()
    });

  } catch (error) {
    console.error("SnapGPT Gemini Error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Gemini request failed."
    });
  }
}
