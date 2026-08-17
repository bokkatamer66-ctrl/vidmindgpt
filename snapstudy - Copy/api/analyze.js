export default async function handler(req, res) {
  handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const { transcript, mode = "summary" } = req.body || {};

    if (typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({
        ok: false,
        error: "No transcript was provided."
      });
    }

    if (transcript.trim().length < 20) {
      return res.status(400).json({
        ok: false,
        error: "The transcript is too short."
      });
    }

    const instructions = {
      summary: `
Create a clear, accurate and useful summary.

Include:
- Main idea
- Important points
- Key details
- Final takeaway

Remove repetition and filler.
Do not invent information.
`,

      explain: `
Explain the content clearly for someone who has not watched the video.

Use:
- Simple explanations
- Clear sections
- Examples only when supported by the transcript
- Important concepts

Do not invent information.
`,

      full: `
Analyze the content deeply.

Return:
1. Quick Summary
2. Key Ideas
3. Detailed Summary
4. Important Details
5. Simple Explanation
6. Main Takeaways

Be accurate, organized and concise.
Do not invent information.
`
    };

    const prompt = `
You are SnapGPT, an intelligent video-analysis assistant.

${instructions[mode] || instructions.summary}

Here is the video transcript:

${transcript}
`;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY is missing in Vercel."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI Error:", data);

      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || "OpenAI API error.",
        code: data?.error?.code || null
      });
    }

    const result = data?.output_text;

    if (!result) {
      return res.status(500).json({
        ok: false,
        error: "OpenAI returned no text."
      });
    }

    return res.status(200).json({
      ok: true,
      result
    });

  } catch (error) {
    console.error("Server Error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "SnapGPT could not analyze the content."
    });
  }
}
