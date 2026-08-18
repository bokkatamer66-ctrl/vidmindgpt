import { GoogleGenAI } from "@google/genai";
import TranscriptClient from "youtube-transcript-api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed",
    });
  }

  try {
    const { videoUrl, mode = "summary" } = req.body || {};

    if (!videoUrl) {
      return res.status(400).json({
        ok: false,
        error: "YouTube video URL is required.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing on Vercel.",
      });
    }

    // Extract YouTube video ID
    let videoId = "";

    try {
      const url = new URL(videoUrl);

      if (url.hostname.includes("youtu.be")) {
        videoId = url.pathname.substring(1);
      } else if (url.hostname.includes("youtube.com")) {
        videoId = url.searchParams.get("v") || "";
      }
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Invalid YouTube URL.",
      });
    }

    if (!videoId) {
      return res.status(400).json({
        ok: false,
        error: "Could not find the YouTube video ID.",
      });
    }

    // Get transcript
    const client = new TranscriptClient();

    await client.ready;

    const transcript = await client.getTranscript(videoId);

    if (!transcript || !transcript.transcript) {
      return res.status(400).json({
        ok: false,
        error: "No transcript was found for this video.",
      });
    }

    const transcriptText = transcript.transcript
      .map((item) => item.text || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!transcriptText) {
      return res.status(400).json({
        ok: false,
        error: "The transcript is empty.",
      });
    }

    // Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    let prompt;

    if (mode === "explain") {
      prompt = `
أنت مساعد تعليمي في موقع SnapGPT.

اشرح محتوى الفيديو التالي للطالب باللغة العربية بطريقة بسيطة ومنظمة.

استخدم:
- الفكرة الرئيسية
- أهم النقاط
- شرح مبسط
- أمثلة عند الحاجة
- خلاصة قصيرة

لا تضف معلومات غير موجودة في النص.

نص الفيديو:
${transcriptText}
`;
    } else {
      prompt = `
أنت مساعد تعليمي في موقع SnapGPT.

لخص محتوى الفيديو التالي باللغة العربية بطريقة مناسبة للطلاب والمذاكرة.

اكتب:
- عنوان مناسب
- ملخص قصير
- أهم النقاط
- أهم المعلومات التي يجب تذكرها
- خلاصة نهائية

اجعل الكلام واضحًا ومنظمًا وبدون تكرار.

نص الفيديو:
${transcriptText}
`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const result = response.text;

    if (!result || !result.trim()) {
      return res.status(500).json({
        ok: false,
        error: "Gemini returned an empty response.",
      });
    }

    return res.status(200).json({
      ok: true,
      result: result.trim(),
    });
  } catch (error) {
    console.error("SnapGPT Error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Server error.",
    });
  }
}
