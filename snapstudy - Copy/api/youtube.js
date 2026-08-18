import TranscriptClient from "youtube-transcript-api";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const body = req.body || {};
const url = typeof body.url === "string"
  ? body.url.trim()
  : "";

if (!url) {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required"
      });
    }

    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );

    if (!match) {
      return res.status(400).json({
        ok: false,
        error: "Invalid YouTube URL"
      });
    }

    const videoId = match[1];

    const client = new TranscriptClient();

    await client.ready;
const transcript = await client.getTranscript(videoId);

const text = transcript
  .map(item => item.text)
  .join(" ");

    if (!text.trim()) {
      return res.status(404).json({
        ok: false,
        error: "No transcript found for this video"
      });
    }

    return res.status(200).json({
      ok: true,
      transcript: text
    });

  } catch (error) {
    console.error("YouTube transcript error:", error);

    return res.status(500).json({
      ok: false,
      error: "Could not retrieve the YouTube transcript."
    });
  }
}
