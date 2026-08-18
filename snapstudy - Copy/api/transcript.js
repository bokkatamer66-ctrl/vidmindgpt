import TranscriptClient from "youtube-transcript-api";

function getVideoId(url) {
    try {
        const parsed = new URL(url);

        const host = parsed.hostname
            .toLowerCase()
            .replace(/^www\./, "");

        if (host === "youtu.be") {
            return parsed.pathname
                .split("/")
                .filter(Boolean)[0] || null;
        }

        if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com"
        ) {
            const v = parsed.searchParams.get("v");

            if (v) return v;

            const match = parsed.pathname.match(
                /^\/(?:shorts|embed|live)\/([^/?]+)/
            );

            return match ? match[1] : null;
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

        let body = req.body;

        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        const url =
            typeof body?.url === "string"
                ? body.url.trim()
                : "";

        if (!url) {
            return res.status(400).json({
                ok: false,
                error: "YouTube URL is required."
            });
        }

        const videoId = getVideoId(url);

        if (!videoId) {
            return res.status(400).json({
                ok: false,
                error: "Invalid YouTube URL."
            });
        }

        console.log(
            "SnapGPT: video ID:",
            videoId
        );

        const client = new TranscriptClient();

        await client.ready;

        console.log(
            "SnapGPT: transcript client ready"
        );

        const data =
            await client.getTranscript(videoId);

        console.log(
            "SnapGPT: transcript received"
        );

        const tracks =
            Array.isArray(data?.tracks)
                ? data.tracks
                : [];

        if (!tracks.length) {
            return res.status(404).json({
                ok: false,
                error:
                    "This video does not have an available transcript."
            });
        }

        let transcript = "";

        for (const track of tracks) {

            if (!Array.isArray(track?.transcript)) {
                continue;
            }

            const text = track.transcript
                .map(segment => {

                    if (
                        typeof segment === "string"
                    ) {
                        return segment;
                    }

                    return (
                        segment?.text ||
                        ""
                    );

                })
                .filter(Boolean)
                .join(" ");

            if (text.trim()) {
                transcript = text;
                break;
            }
        }

        transcript = transcript
            .replace(/\s+/g, " ")
            .trim();

        if (!transcript) {
            return res.status(404).json({
                ok: false,
                error:
                    "No transcript was found for this video."
            });
        }

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

        return res.status(500).json({
            ok: false,
            error:
                error?.message ||
                String(error) ||
                "Could not retrieve transcript."
        });
    }
}
