import TranscriptClient from "youtube-transcript-api";

function getVideoId(url) {
  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    // youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      return parsed.pathname
        .split("/")
        .filter(Boolean)[0] || null;
    }

    // youtube.com URLs
    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {
      // /watch?v=VIDEO_ID
      const watchId = parsed.searchParams.get("v");

      if (watchId) {
        return watchId;
      }

      // /shorts/VIDEO_ID
      const shortsMatch =
        parsed.pathname.match(/^\/shorts\/([^/?]+)/);

      if (shortsMatch) {
        return shortsMatch[1];
      }

      // /embed/VIDEO_ID
      const embedMatch =
        parsed.pathname.match(/^\/embed\/([^/?]+)/);

      if (embedMatch) {
        return embedMatch[1];
      }

      // /live/VIDEO_ID
      const liveMatch =
        parsed.pathname.match(/^\/live\/([^/?]+)/);

      if (liveMatch) {
        return liveMatch[1];
      }
    }

    return null;

  } catch (error) {
    console.error("URL parsing error:", error);
    return null;
  }
}


export default async function handler(req, res) {

  // Only POST is allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed."
    });
  }


  try {

    /* --------------------------------------------------
       Read request body
    -------------------------------------------------- */

    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          ok: false,
          error: "Invalid request body."
        });
      }
    }


    const url = body?.url;


    if (
      !url ||
      typeof url !== "string"
    ) {
      return res.status(400).json({
        ok: false,
        error: "YouTube URL is required."
      });
    }


    /* --------------------------------------------------
       Extract YouTube video ID
    -------------------------------------------------- */

    const videoId = getVideoId(url);


    if (!videoId) {
      return res.status(400).json({
        ok: false,
        error: "Invalid YouTube URL."
      });
    }


    console.log(
      "SnapGPT: Getting transcript for:",
      videoId
    );


    /* --------------------------------------------------
       Create transcript client
    -------------------------------------------------- */

    const client = new TranscriptClient();

    await client.ready;


    /* --------------------------------------------------
       Get transcript
    -------------------------------------------------- */

    const data =
      await client.getTranscript(videoId);


    console.log(
      "SnapGPT: Transcript API response received."
    );


    /* --------------------------------------------------
       Validate response
    -------------------------------------------------- */

    if (!data) {
      return res.status(404).json({
        ok: false,
        error:
          "YouTube did not return transcript data."
      });
    }


    if (
      !Array.isArray(data.tracks) ||
      data.tracks.length === 0
    ) {

      return res.status(404).json({
        ok: false,
        error:
          "This video does not have an available transcript."
      });
    }


    /* --------------------------------------------------
       Select first usable track
    -------------------------------------------------- */

    const track =
      data.tracks.find(
        item =>
          Array.isArray(item?.transcript) &&
          item.transcript.length > 0
      );


    if (!track) {
      return res.status(404).json({
        ok: false,
        error:
          "No usable transcript was found for this video."
      });
    }


    /* --------------------------------------------------
       Build transcript text
    -------------------------------------------------- */

    const transcript =
      track.transcript
        .map(segment => {

          if (
            typeof segment === "string"
          ) {
            return segment;
          }

          return (
            segment?.text ||
            segment?.snippet ||
            ""
          );

        })
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();


    /* --------------------------------------------------
       Validate transcript
    -------------------------------------------------- */

    if (!transcript) {
      return res.status(404).json({
        ok: false,
        error:
          "The transcript was returned empty."
      });
    }


    if (transcript.length < 20) {
      return res.status(404).json({
        ok: false,
        error:
          "The transcript is too short to summarize."
      });
    }


    /* --------------------------------------------------
       Success
    -------------------------------------------------- */

    console.log(
      "SnapGPT: Transcript retrieved successfully."
    );


    return res.status(200).json({
      ok: true,
      videoId,
      transcript
    });


  } catch (error) {

    console.error(
      "SnapGPT Transcript Error:",
      error
    );


    /* --------------------------------------------------
       Return useful error instead of hiding it
    -------------------------------------------------- */

    const message =
      error?.message ||
      "Could not retrieve the video transcript.";


    return res.status(500).json({
      ok: false,
      error: message
    });
  }
}
