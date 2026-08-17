import TranscriptClient from "youtube-transcript-api";

function getVideoId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace("/", "").trim();
    }

    if (
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      return parsed.searchParams.get("v");
    }

    if (parsed.hostname === "www.youtube.com" && parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/")[2];
    }

    if (parsed.hostname === "www.youtube.com" && parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/")[2];
    }

    return null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }

  try {
    const { url } = req.body || {};

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required."
      });
    }

    const videoId = getVideoId(url);

    if (!videoId) {
      return res.status(400).json({
        ok: false,
        error: "Could not extract the YouTube video ID."
      });
    }

    const client = new TranscriptClient();

    await client.ready;

    const transcript = await client.getTranscript(videoId);

    if (!transcript || !transcript.length) {
      return res.status(404).json({
        ok: false,
        error: "No transcript is available for this video."
      });
    }

    const text = transcript
      .map(item => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 20) {
      return res.status(404).json({
        ok: false,
        error: "The transcript is empty or too short."
      });
    }

    return res.status(200).json({
      ok: true,
      videoId,
      transcript: text
    });

  } catch (error) {
    console.error("Transcript Error:", error);

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Could not retrieve the YouTube transcript."
    });
  }
}
