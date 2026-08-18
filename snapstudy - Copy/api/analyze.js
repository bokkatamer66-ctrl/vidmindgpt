import TranscriptClient from "youtube-transcript-api";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method Not Allowed"
      });
    }

    const { videoUrl } = req.body || {};

    if (!videoUrl) {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required."
      });
    }

    let videoId = "";

    try {
      const url = new URL(videoUrl);

      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1).split("?")[0];
      } else {
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

    const client = new TranscriptClient();

    await client.ready;

    const data = await client.getTranscript(videoId);

    const transcript = data?.transcript || [];

    if (!transcript.length) {
      return res.status(200).json({
        ok: false,
        error: "No transcript found for this video."
      });
    }

    const text = transcript
      .map(item => item.text || "")
      .join(" ")
      .trim();

    return res.status(200).json({
      ok: true,
      result: "Transcript received successfully!",
      characters: text.length,
      preview: text.slice(0, 500)
    });

  } catch (error) {
    console.error("Transcript Error:", error);

    return res.status(200).json({
      ok: false,
      error: error?.message || "Transcript extraction failed."
    });
  }
}
