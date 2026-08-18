export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                ok: false,
                error: "Method not allowed"
            });
        }

        let body = req.body;

        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        const url = body?.url;

        if (!url) {
            return res.status(400).json({
                ok: false,
                error: "YouTube URL is required"
            });
        }

        return res.status(200).json({
            ok: true,
            test: true,
            message: "SnapGPT transcript endpoint is working",
            receivedUrl: url
        });

    } catch (error) {
        console.error("TRANSCRIPT TEST ERROR:", error);

        return res.status(500).json({
            ok: false,
            error: error?.message || String(error)
        });
    }
}
