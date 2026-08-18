import { GoogleGenAI } from "@google/genai";
import TranscriptClient from "youtube-transcript-api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const { videoUrl, mode = "summary" } = req.body || {};

    if (!videoUrl) {
      return res.status(400).json({
        ok: false,
        error: "YouTube video URL is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing."
      });
    }

    // Get YouTube video ID
    let videoId = "";

    try {
      const url = new URL(videoUrl);

      if (url.hostname.includes("youtu.be")) {
        videoId = url.pathname.replace("/", "").split("?")[0];
      } else if (url.hostname.includes("youtube.com")) {
        videoId = url.searchParams.get("v") || "";
      }
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Invalid YouTube URL."
      });
    }

    if (!videoId) {
      return res.status(400).json({
        ok: false,
        error: "Could not find YouTube video ID."
      });
    }

    // Get transcript
    const client = new TranscriptClient();

    await client.ready;

    const transcriptData = await client.getTranscript(videoId);

    if (!transcriptData || !transcriptData.transcript) {
      return res.status(400).json({
        ok: false,
        error: "No transcript was found for this video."
      });
    }

    const transcriptText = transcriptData.transcript
      .map(item => item.text || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!transcriptText) {
      return res.status(400).json({
        ok: false,
        error: "The video transcript is empty."
      });
    }

    // Gemini
    const ai = new GoogleGenAI({
      apiKey
    });

    const prompt =
      mode === "explain"
        ? `
أنت SnapGPT، مساعد تعليمي للطلاب.

اشرح محتوى فيديو YouTube التالي باللغة العربية بطريقة سهلة ومنظمة.

اكتب:
1. الفكرة الرئيسية
2. أهم الأفكار
3. شرح مبسط لكل فكرة
4. أمثلة إذا كانت موجودة في المحتوى
5. خلاصة قصيرة للمذاكرة

اعتمد على النص الموجود فقط ولا تخترع معلومات غير موجودة.

نص الفيديو:
${transcriptText}
`
        : `
أنت SnapGPT، مساعد تعليمي للطلاب.

لخّص نص فيديو YouTube التالي باللغة العربية بطريقة واضحة وسهلة للمذاكرة.

اكتب بالترتيب:

العنوان:
ملخص سريع:

أهم النقاط:
- نقطة
- نقطة
- نقطة

أهم المعلومات التي يجب تذكرها:

الخلاصة:

حافظ على المعلومات المهمة، واحذف التكرار والكلام غير المفيد.

نص الفيديو:
${transcriptText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt
    });

    const result = response.text;

    if (!result || !result.trim()) {
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
    console.error("SnapGPT Analyze Error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to analyze video."
    });
  }
}
