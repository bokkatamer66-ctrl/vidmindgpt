import { GoogleGenAI } from "@google/genai";
import { YoutubeTranscript } from "youtube-transcript-api";

export default async function handler(req, res) {
  // Allow requests from the website
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle browser preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed",
    });
  }

  try {
    // Read request body
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          ok: false,
          error: "Invalid request body.",
        });
      }
    }

    const { videoUrl, mode = "summary" } = body || {};

    // Check YouTube URL
    if (!videoUrl || typeof videoUrl !== "string") {
      return res.status(400).json({
        ok: false,
        error: "YouTube video URL is required.",
      });
    }

    // Check Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is not configured on Vercel.",
      });
    }

    // Get YouTube transcript
    let transcript;

    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
    } catch (error) {
      console.error("Transcript Error:", error);

      return res.status(400).json({
        ok: false,
        error:
          "Could not get the transcript for this YouTube video. Make sure captions are available.",
      });
    }

    if (!Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No transcript was found for this video.",
      });
    }

    // Convert transcript to plain text
    const transcriptText = transcript
      .map((item) => item.text || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!transcriptText) {
      return res.status(400).json({
        ok: false,
        error: "The video transcript is empty.",
      });
    }

    // Create Gemini client
    const ai = new GoogleGenAI({
      apiKey,
    });

    // Choose the task
    let instruction;

    if (mode === "explain") {
      instruction = `
اشرح محتوى الفيديو التالي للطالب بطريقة بسيطة وواضحة باللغة العربية.

قسّم الشرح إلى:
1. الفكرة الرئيسية
2. أهم الأفكار
3. شرح النقاط المهمة
4. أمثلة بسيطة إذا كانت مناسبة
5. خلاصة قصيرة في النهاية

لا تضف معلومات غير موجودة في النص إلا إذا كانت ضرورية جدًا لفهم الفكرة.

نص الفيديو:
${transcriptText}
`;
    } else {
      instruction = `
لخّص محتوى الفيديو التالي باللغة العربية بطريقة مناسبة للطلاب.

اجعل الناتج منظمًا وسهل المذاكرة، ويحتوي على:
1. عنوان مناسب
2. ملخص قصير
3. أهم النقاط في شكل نقاط واضحة
4. أهم المصطلحات أو المعلومات التي يجب تذكرها
5. خلاصة نهائية

حافظ على المعلومات المهمة ولا تكرر الكلام.

نص الفيديو:
${transcriptText}
`;
    }

    // Generate AI response
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: instruction,
    });

    const result = response.text;

    if (!result || !result.trim()) {
      return res.status(500).json({
        ok: false,
        error: "Gemini returned an empty response.",
      });
    }

    // Send result to website
    return res.status(200).json({
      ok: true,
      result: result.trim(),
    });
  } catch (error) {
    console.error("Analyze API Error:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "An unexpected error occurred while analyzing the video.",
    });
  }
}
