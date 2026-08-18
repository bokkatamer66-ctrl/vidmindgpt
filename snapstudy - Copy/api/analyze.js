export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is missing on Vercel."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
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
                  text: "Reply in Arabic with exactly: SnapGPT Gemini يعمل بنجاح!"
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
        error:
          data?.error?.message ||
          `Gemini returned HTTP ${response.status}`,
        code: data?.error?.code || response.status
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!result) {
      return res.status(200).json({
        ok: false,
        error: "Gemini returned no text."
      });
    }

    return res.status(200).json({
      ok: true,
      result: result.trim()
    });

  } catch (error) {
    return res.status(200).json({
      ok: false,
      error: error?.message || "Gemini connection failed."
    });
  }
}
