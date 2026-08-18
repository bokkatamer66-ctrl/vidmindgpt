import TranscriptClient from "youtube-transcript-api";

function getVideoId(url) {
    try {
        const parsed = new URL(url);

        const host = parsed.hostname
            .toLowerCase()
            .replace(/^www\./, "");

        if (host === "youtu.be") {
            const id = parsed.pathname
                .split("/")
                .filter(Boolean)[0];

            return /^[A-Za-z0-9_-]{11}$/.test(id)
                ? id
                : null;
        }

        if (
            host === "youtube.com" ||
            host === "m.youtube.com" ||
            host === "music.youtube.com"
        ) {
            const watchId = parsed.searchParams.get("v");

            if (
                watchId &&
                /^[A-Za-z0-9_-]{11}$/.test(watchId)
            ) {
                return watchId;
            }

            const match = parsed.pathname.match(
                /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/
            );

            return match ? match[1] : null;
        }

        return null;

    } catch {
        return null;
    }
}


function errorText(error) {
    if (!error) {
        return "Unknown transcript error.";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "object") {
        if (typeof error.message === "string") {
            return error.message;
        }

        if (typeof error.error === "string") {
            return error.error;
        }

        try {
            return JSON.stringify(error);
        } catch {
            return "Unknown transcript error.";
        }
    }

    return String(error);
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
            try {
                body = JSON.parse(body);
            } catch {
                return res.status(400).json({
                    ok: false,
                    error: "Invalid request body."
                });
            }
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
            "SnapGPT: Starting transcript request:",
            videoId
        );


        /*
         * Create the client.
         *
         * youtube-transcript-api 3.x requires
         * waiting for client.ready before calling
         * getTranscript().
         */

        const client = new TranscriptClient();

        await client.ready;


        console.log(
            "SnapGPT: Transcript client ready."
        );


        const data =
            await client.getTranscript(videoId);


        console.log(
            "SnapGPT: YouTube response received."
        );


        if (!data) {
            return res.status(404).json({
                ok: false,
                error: "YouTube returned no transcript data."
            });
        }


        /*
         * The package returns an object containing
         * a tracks array.
         */

        const tracks =
            Array.isArray(data.tracks)
                ? data.tracks
                : [];


        if (tracks.length === 0) {

            const reason =
                data.playabilityStatus?.reason;

            return res.status(404).json({
                ok: false,
                error:
                    reason ||
                    "This video does not have an available transcript."
            });
        }


        /*
         * Find the first usable transcript track.
         */

        const track =
            tracks.find(
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


        /*
         * Convert transcript segments to plain text.
         */

        const transcript =
            track.transcript
                .map(segment => {

                    if (
                        typeof segment?.text === "string"
                    ) {
                        return segment.text;
                    }

                    if (
                        typeof segment === "string"
                    ) {
                        return segment;
                    }

                    return "";

                })
                .filter(Boolean)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();


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
                    "The transcript is too short to analyze."
            });
        }


        console.log(
            "SnapGPT: Transcript retrieved successfully.",
            transcript.length,
            "characters"
        );


        return res.status(200).json({
            ok: true,
            videoId,
            transcript
        });


    } catch (error) {

        const message =
            errorText(error);


        console.error(
            "SnapGPT Transcript Error:",
            error
        );


        return res.status(500).json({
            ok: false,
            error: message
        });
    }
}
