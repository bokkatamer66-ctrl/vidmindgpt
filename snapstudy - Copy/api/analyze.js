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
      } else if (
        url.hostname === "youtube.com" ||
        url.hostname === "www.youtube.com" ||
        url.hostname === "m.youtube.com"
      ) {
        videoId = url.searchParams.get("v") || "";
      }
    } catch (error) {
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

    return res.status(200).json({
      ok: true,
      result: "YouTube link received successfully!",
      videoId: videoId
    });

  } catch (error) {
    console.error(error);

    return res.status(200).json({
      ok: false,
      error: error?.message || "Unknown error"
    });
  }
}
