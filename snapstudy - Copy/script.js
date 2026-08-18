/* =========================================================
   SnapGPT — Main Frontend Script
   Clean & Stable Version
   ========================================================= */

"use strict";


/* =========================================================
   DOM
   ========================================================= */

const $ = (id) => document.getElementById(id);

const youtubeUrl = $("youtubeUrl");
const startButton = $("start");
const uploadButton = $("upload");
const summarizeButton = $("summarize");
const explainButton = $("explain");

const statusText = $("statusText");
const loader = $("loader");
const output = $("output");

const copyButton = $("copyResult");
const clearButton = $("clearResult");


/* =========================================================
   Default Text
   ========================================================= */

const DEFAULT_RESULT =
    "Your AI-generated result will appear here.";

const DEFAULT_STATUS =
    "Ready for your video.";


/* =========================================================
   Loading
   ========================================================= */

function setLoading(isLoading, message = "") {

    if (loader) {
        loader.classList.toggle("active", isLoading);
    }

    const buttons = [
        startButton,
        summarizeButton,
        explainButton
    ];

    buttons.forEach((button) => {

        if (!button) return;

        button.disabled = isLoading;

        if (isLoading) {
            button.style.opacity = "0.65";
        } else {
            button.style.opacity = "1";
        }

    });

    if (message && statusText) {
        statusText.textContent = message;
    }
}


/* =========================================================
   Status
   ========================================================= */

function setStatus(message) {

    if (statusText) {
        statusText.textContent = message;
    }

}


/* =========================================================
   Error Normalizer
   ========================================================= */

function getErrorMessage(error) {

    if (!error) {
        return "Something went wrong.";
    }


    /* Error object */

    if (error instanceof Error) {

        if (error.message) {
            return error.message;
        }

    }


    /* String */

    if (typeof error === "string") {
        return error;
    }


    /* API object */

    if (typeof error === "object") {

        const possibleMessages = [
            error.error,
            error.message,
            error.details,
            error.reason,
            error.statusText,
            error.data?.error,
            error.data?.message
        ];

        for (const message of possibleMessages) {

            if (typeof message === "string" && message.trim()) {
                return message.trim();
            }

        }


        /* Nested object */

        if (error.error && typeof error.error === "object") {

            const nested = getErrorMessage(error.error);

            if (nested) {
                return nested;
            }

        }


        /* Last resort */

        try {

            return JSON.stringify(error);

        } catch {

            return "The server returned an unknown error.";

        }

    }


    return String(error);
}


/* =========================================================
   Show Error
   ========================================================= */

function showError(error) {

    const message = getErrorMessage(error);

    console.error("SnapGPT Error:", error);

    if (output) {

        output.textContent =
            "⚠️ SnapGPT Error\n\n" +
            message;

    }

    setStatus("Something went wrong.");

}


/* =========================================================
   Clear Result
   ========================================================= */

function clearResult() {

    if (youtubeUrl) {
        youtubeUrl.value = "";
    }

    if (output) {
        output.textContent = DEFAULT_RESULT;
    }

    setStatus(DEFAULT_STATUS);

}


/* =========================================================
   YouTube Video ID
   ========================================================= */

function getYouTubeVideoId(url) {

    try {

        const parsed = new URL(url.trim());

        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        /* ---------------------------------------------
           youtu.be
        --------------------------------------------- */

        if (hostname === "youtu.be") {

            const id =
                parsed.pathname
                    .split("/")
                    .filter(Boolean)[0];

            return isValidVideoId(id)
                ? id
                : null;
        }


        /* ---------------------------------------------
           youtube.com
        --------------------------------------------- */

        if (
            hostname === "youtube.com" ||
            hostname === "m.youtube.com" ||
            hostname === "music.youtube.com"
        ) {


            /* watch?v= */

            const watchId =
                parsed.searchParams.get("v");

            if (isValidVideoId(watchId)) {
                return watchId;
            }


            /* shorts */

            const shortsMatch =
                parsed.pathname.match(
                    /^\/shorts\/([^/?#]+)/
                );

            if (
                shortsMatch &&
                isValidVideoId(shortsMatch[1])
            ) {

                return shortsMatch[1];

            }


            /* embed */

            const embedMatch =
                parsed.pathname.match(
                    /^\/embed\/([^/?#]+)/
                );

            if (
                embedMatch &&
                isValidVideoId(embedMatch[1])
            ) {

                return embedMatch[1];

            }


            /* live */

            const liveMatch =
                parsed.pathname.match(
                    /^\/live\/([^/?#]+)/
                );

            if (
                liveMatch &&
                isValidVideoId(liveMatch[1])
            ) {

                return liveMatch[1];

            }

        }


        return null;

    } catch {

        return null;

    }

}


/* =========================================================
   Validate Video ID
   ========================================================= */

function isValidVideoId(id) {

    return (
        typeof id === "string" &&
        /^[A-Za-z0-9_-]{11}$/.test(id)
    );

}


/* =========================================================
   Read API Response
   ========================================================= */

async function readApiResponse(response) {

    const rawText =
        await response.text();


    if (!rawText || !rawText.trim()) {

        throw new Error(
            `Server returned an empty response (${response.status}).`
        );

    }


    let data;

    try {

        data =
            JSON.parse(rawText);

    } catch (error) {

        console.error(
            "SnapGPT: Invalid JSON response:",
            rawText
        );

        throw new Error(
            `Server returned invalid JSON (${response.status}).`
        );

    }


    return data;

}


/* =========================================================
   Request Transcript
   ========================================================= */

async function requestTranscript(url, videoId) {

    setStatus(
        "Retrieving YouTube transcript..."
    );


    const response =
        await fetch(
            "/api/transcript",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    url: url,
                    videoId: videoId
                })
            }
        );


    const data =
        await readApiResponse(response);


    console.log(
        "SnapGPT Transcript API:",
        data
    );


    if (!response.ok) {

        throw new Error(
            getErrorMessage(data) ||
            `Transcript request failed (${response.status}).`
        );

    }


    if (data.ok === false) {

        throw new Error(
            getErrorMessage(data) ||
            "Could not retrieve the video transcript."
        );

    }


    const transcript =
        data.transcript ||
        data.text ||
        data.data?.transcript ||
        data.data?.text;


    if (
        typeof transcript !== "string" ||
        !transcript.trim()
    ) {

        throw new Error(
            "No transcript was found for this video."
        );

    }


    return transcript.trim();

}


/* =========================================================
   Analyze Transcript
   ========================================================= */

async function analyzeTranscript(
    transcript,
    mode = "summary"
) {

    setStatus(
        mode === "explain"
            ? "SnapGPT is explaining the video..."
            : "SnapGPT is creating your summary..."
    );


    const response =
        await fetch(
            "/api/analyze",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    transcript: transcript,
                    mode: mode
                })
            }
        );


    const data =
        await readApiResponse(response);


    console.log(
        "SnapGPT Analyze API:",
        data
    );


    if (!response.ok) {

        throw new Error(
            getErrorMessage(data) ||
            `AI request failed (${response.status}).`
        );

    }


    if (data.ok === false) {

        throw new Error(
            getErrorMessage(data) ||
            "The AI could not analyze the transcript."
        );

    }


    const result =
        data.result ||
        data.summary ||
        data.text ||
        data.output ||
        data.data?.result ||
        data.data?.summary ||
        data.data?.text;


    if (
        typeof result !== "string" ||
        !result.trim()
    ) {

        throw new Error(
            "The AI returned an empty result."
        );

    }


    return result.trim();

}


/* =========================================================
   Format Result
   ========================================================= */

function formatResult(text) {

    if (!text) {
        return "";
    }


    return String(text)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

}


/* =========================================================
   Main Process
   ========================================================= */

async function processVideo(mode = "summary") {

    if (!youtubeUrl) {

        showError(
            "YouTube input field was not found."
        );

        return;

    }


    const url =
        youtubeUrl.value.trim();


    /* ---------------------------------------------
       Empty
    --------------------------------------------- */

    if (!url) {

        showError(
            "Please paste a YouTube link first."
        );

        youtubeUrl.focus();

        return;

    }


    /* ---------------------------------------------
       YouTube validation
    --------------------------------------------- */

    const videoId =
        getYouTubeVideoId(url);


    if (!videoId) {

        showError(
            "Please enter a valid YouTube video link."
        );

        youtubeUrl.focus();

        return;

    }


    /* ---------------------------------------------
       Start loading
    --------------------------------------------- */

    setLoading(
        true,
        "Connecting to YouTube..."
    );


    if (output) {

        output.textContent =
            "Retrieving transcript...";

    }


    try {


        /* =========================================
           STEP 1 — Transcript
        ========================================= */

        const transcript =
            await requestTranscript(
                url,
                videoId
            );


        console.log(
            "SnapGPT: Transcript received.",
            transcript.length,
            "characters"
        );


        if (output) {

            output.textContent =
                "Transcript received.\n\nAI is analyzing the video...";

        }


        /* =========================================
           STEP 2 — AI
        ========================================= */

        const result =
            await analyzeTranscript(
                transcript,
                mode
            );


        /* =========================================
           STEP 3 — Display
        ========================================= */

        if (output) {

            output.textContent =
                formatResult(result);

        }


        setStatus(
            mode === "explain"
                ? "Explanation completed successfully! ✨"
                : "Summary completed successfully! ✨"
        );


        /* Scroll result into view */

        const resultArea =
            $("resultArea");

        if (resultArea) {

            resultArea.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }


        console.log(
            "SnapGPT: Video processed successfully."
        );


    } catch (error) {

        showError(error);

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   Copy Result
   ========================================================= */

async function copyResult() {

    if (!output) {
        return;
    }


    const text =
        output.textContent.trim();


    if (
        !text ||
        text === DEFAULT_RESULT
    ) {

        setStatus(
            "There is no result to copy yet."
        );

        return;

    }


    try {

        await navigator.clipboard.writeText(text);


        if (copyButton) {

            const original =
                copyButton.textContent;

            copyButton.textContent =
                "✅ Copied!";


            setTimeout(() => {

                copyButton.textContent =
                    original || "📋 Copy";

            }, 1600);

        }


        setStatus(
            "Result copied successfully."
        );


    } catch (error) {

        console.error(
            "SnapGPT Copy Error:",
            error
        );

        setStatus(
            "Could not copy the result."
        );

    }

}


/* =========================================================
   Upload
   ========================================================= */

function handleUpload() {

    setStatus(
        "Upload mode is coming soon."
    );


    if (output) {

        output.textContent =
            "📤 Upload mode is coming soon.";

    }

}


/* =========================================================
   Event Listeners
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        console.log(
            "SnapGPT: Frontend loaded successfully."
        );


        /* ---------------------------------------------
           Let's Go
        --------------------------------------------- */

        if (startButton) {

            startButton.addEventListener(
                "click",
                () => processVideo("summary")
            );

        }


        /* ---------------------------------------------
           Summarize
        --------------------------------------------- */

        if (summarizeButton) {

            summarizeButton.addEventListener(
                "click",
                () => processVideo("summary")
            );

        }


        /* ---------------------------------------------
           Explain
        --------------------------------------------- */

        if (explainButton) {

            explainButton.addEventListener(
                "click",
                () => processVideo("explain")
            );

        }


        /* ---------------------------------------------
           Upload
        --------------------------------------------- */

        if (uploadButton) {

            uploadButton.addEventListener(
                "click",
                handleUpload
            );

        }


        /* ---------------------------------------------
           Copy
        --------------------------------------------- */

        if (copyButton) {

            copyButton.addEventListener(
                "click",
                copyResult
            );

        }


        /* ---------------------------------------------
           Clear
        --------------------------------------------- */

        if (clearButton) {

            clearButton.addEventListener(
                "click",
                clearResult
            );

        }


        /* ---------------------------------------------
           Enter key
        --------------------------------------------- */

        if (youtubeUrl) {

            youtubeUrl.addEventListener(
                "keydown",
                (event) => {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        processVideo("summary");

                    }

                }
            );

        }

    }
);


/* =========================================================
   Global Functions
   ========================================================= */

window.processVideo =
    processVideo;

window.copyResult =
    copyResult;

window.clearResult =
    clearResult;

window.showError =
    showError;


/* =========================================================
   Ready
   ========================================================= */

console.log(
    "SnapGPT: Script initialized."
);
