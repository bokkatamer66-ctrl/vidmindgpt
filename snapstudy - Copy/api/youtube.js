```javascript
import TranscriptClient from "youtube-transcript-api";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {

    const body = req.body || {};

    const url =
      typeof body.url === "string"
        ? body.url.trim()
        : "";

    if (!url) {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required."
      });
    }

    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/
    );

    if (!match) {
      return res.status(400).json({
        ok: false,
        error: "Invalid YouTube URL."
      });
    }

    const videoId = match[1];

    const client = new TranscriptClient();

    await client.ready;

    const data =
      await client.getTranscript(videoId);

    /*
      youtube-transcript-api 3.x returns
      a transcript object.

      The actual transcript lines are inside
      the tracks array.
    */

    let lines = [];

    if (Array.isArray(data)) {
      lines = data;
    } else if (Array.isArray(data?.transcript)) {
      lines = data.transcript;
    } else if (Array.isArray(data?.tracks)) {

      for (const track of data.tracks) {

        if (Array.isArray(track?.transcript)) {
          lines.push(...track.transcript);
        }

        if (Array.isArray(track?.events)) {
          lines.push(...track.events);
        }

      }

    }

    const text = lines
      .map(item => {

        if (typeof item === "string") {
          return item;
        }

        return (
          item?.text ||
          item?.snippet?.text ||
          ""
        );

      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {

      return res.status(404).json({
        ok: false,
        error:
          "No transcript is available for this YouTube video."
      });

    }

    return res.status(200).json({
      ok: true,
      transcript: text
    });

  } catch (error) {

    console.error(
      "SnapGPT YouTube transcript error:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Could not retrieve the YouTube transcript."
    });

  }

}
```
