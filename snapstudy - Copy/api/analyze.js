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

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Analyze this YouTube video URL and tell me whether you can access its content. URL: " +
                    videoUrl
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        error: data?.error?.message || "Gemini request failed.",
        code: data?.error?.code || response.status
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return res.status(200).json({
      ok: true,
      result: result || "Gemini returned no text."
    });

  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error?.message || "Unexpected error."
    });
  }
}
