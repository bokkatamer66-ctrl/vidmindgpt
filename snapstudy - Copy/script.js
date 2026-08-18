/* =========================================================
   SnapGPT - Main Frontend Script
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   DOM Helpers
--------------------------------------------------------- */

function getElement(...ids) {
    for (const id of ids) {
        const element = document.getElementById(id);
        if (element) return element;
    }
    return null;
}

function setLoading(button, loading) {
    if (!button) return;

    button.disabled = loading;

    const btnText = button.querySelector(".btn-text");
    const loader = button.querySelector(".loader");

    if (btnText) {
        btnText.style.opacity = loading ? "0" : "1";
    }

    if (loader) {
        loader.classList.toggle("hidden", !loading);
    }

    if (!btnText && !loader) {
        button.dataset.originalText ??= button.textContent;
        button.textContent = loading
            ? "Processing..."
            : button.dataset.originalText;
    }
}


/* ---------------------------------------------------------
   YouTube URL Validation
--------------------------------------------------------- */

function getYouTubeVideoId(url) {
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
            // youtube.com/watch?v=VIDEO_ID
            const watchId = parsed.searchParams.get("v");

            if (watchId) {
                return watchId;
            }

            // youtube.com/shorts/VIDEO_ID
            const shortsMatch = parsed.pathname.match(
                /^\/shorts\/([^/?]+)/
            );

            if (shortsMatch) {
                return shortsMatch[1];
            }

            // youtube.com/embed/VIDEO_ID
            const embedMatch = parsed.pathname.match(
                /^\/embed\/([^/?]+)/
            );

            if (embedMatch) {
                return embedMatch[1];
            }

            // youtube.com/live/VIDEO_ID
            const liveMatch = parsed.pathname.match(
                /^\/live\/([^/?]+)/
            );

            if (liveMatch) {
                return liveMatch[1];
            }
        }

        return null;

    } catch {
        return null;
    }
}


/* ---------------------------------------------------------
   API JSON Helper
--------------------------------------------------------- */

async function readJSON(response) {
    const text = await response.text();

    if (!text) {
        throw new Error("The server returned an empty response.");
    }

    try {
        return JSON.parse(text);
    } catch {
        console.error("SnapGPT: Invalid JSON response:", text);

        throw new Error(
            "The server returned an invalid response."
        );
    }
}


/* ---------------------------------------------------------
   Error Message
--------------------------------------------------------- */

function showError(message) {
    const errorMessage = document.getElementById("errorMessage");

    if (!errorMessage) {
        alert(message);
        return;
    }

    errorMessage.textContent = `⚠️ ${message}`;
    errorMessage.classList.remove("hidden");

    errorMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* ---------------------------------------------------------
   Hide Error
--------------------------------------------------------- */

function hideError() {
    const errorMessage = document.getElementById("errorMessage");

    if (!errorMessage) return;

    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
}


/* ---------------------------------------------------------
   Main Video Processing
--------------------------------------------------------- */

async function processVideo(mode = "summary") {

    /*
      Support all possible button IDs used in SnapGPT.
    */

    const urlInput = getElement(
        "videoUrl",
        "youtubeUrl",
        "urlInput"
    );

    const startButton = getElement(
        "start",
        "summarizeBtn",
        "summarize"
    );

    const resultArea = getElement(
        "resultArea",
        "results",
        "result"
    );

    const summaryContent = getElement(
        "summaryContent",
        "resultContent",
        "output"
    );

    if (!urlInput) {
        console.error(
            "SnapGPT: YouTube URL input was not found."
        );

        showError(
            "لم يتم العثور على خانة رابط YouTube."
        );

        return;
    }

    if (!summaryContent) {
        console.error(
            "SnapGPT: Result area was not found."
        );

        showError(
            "لم يتم العثور على مكان عرض النتيجة."
        );

        return;
    }

    hideError();

    if (resultArea) {
        resultArea.classList.add("hidden");
    }

    summaryContent.innerHTML = "";

    const videoUrl = urlInput.value.trim();

    /* -----------------------------------------------------
       Check empty URL
    ----------------------------------------------------- */

    if (!videoUrl) {
        showError(
            "من فضلك الصق رابط فيديو YouTube أولاً."
        );

        urlInput.focus();
        return;
    }


    /* -----------------------------------------------------
       Validate YouTube URL
    ----------------------------------------------------- */

    const videoId = getYouTubeVideoId(videoUrl);

    if (!videoId) {
        showError(
            "الرابط غير صحيح. من فضلك استخدم رابط YouTube صالح."
        );

        urlInput.focus();
        return;
    }


    /* -----------------------------------------------------
       Loading
    ----------------------------------------------------- */

    setLoading(startButton, true);


    try {

        /* =================================================
           STEP 1
           Get YouTube Transcript
        ================================================= */

        console.log(
            "SnapGPT: Requesting transcript...",
            videoId
        );

        const transcriptResponse = await fetch(
            "/api/transcript",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify({
                    url: videoUrl,
                    videoId: videoId
                })
            }
        );


        const transcriptData =
            await readJSON(transcriptResponse);


        console.log(
            "SnapGPT transcript response:",
            transcriptData
        );


        if (
            !transcriptResponse.ok ||
            transcriptData.ok === false
        ) {

            throw new Error(
                transcriptData.error ||
                transcriptData.message ||
                "Could not retrieve the video transcript."
            );
        }


        /* -------------------------------------------------
           Accept several possible transcript response names
        ------------------------------------------------- */

        const transcript =
            transcriptData.transcript ||
            transcriptData.text ||
            transcriptData.data?.transcript ||
            transcriptData.data?.text;


        if (
            typeof transcript !== "string" ||
            !transcript.trim()
        ) {

            throw new Error(
                "No transcript was found for this YouTube video."
            );
        }


        /* =================================================
           STEP 2
           Send Transcript to AI
        ================================================= */

        console.log(
            "SnapGPT: Sending transcript to AI..."
        );


        const analyzeResponse = await fetch(
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


        const analyzeData =
            await readJSON(analyzeResponse);


        console.log(
            "SnapGPT AI response:",
            analyzeData
        );


        if (
            !analyzeResponse.ok ||
            analyzeData.ok === false
        ) {

            throw new Error(
                analyzeData.error ||
                analyzeData.message ||
                "The AI could not analyze the transcript."
            );
        }


        /* -------------------------------------------------
           Get AI result
        ------------------------------------------------- */

        const result =
            analyzeData.result ||
            analyzeData.summary ||
            analyzeData.text ||
            analyzeData.output ||
            analyzeData.data?.result ||
            analyzeData.data?.summary;


        if (
            typeof result !== "string" ||
            !result.trim()
        ) {

            throw new Error(
                "The AI returned no summary."
            );
        }


        /* =================================================
           STEP 3
           Display Result
        ================================================= */

        summaryContent.innerHTML =
            formatSummary(result);


        if (resultArea) {
            resultArea.classList.remove("hidden");

            resultArea.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


        console.log(
            "SnapGPT: Video processed successfully."
        );


    } catch (error) {

        console.error(
            "SnapGPT Error:",
            error
        );


        showError(
            error?.message ||
            "حدث خطأ أثناء معالجة الفيديو. حاول مرة أخرى."
        );


    } finally {

        setLoading(startButton, false);
    }
}


/* ---------------------------------------------------------
   Copy Result
--------------------------------------------------------- */

async function copyResult() {

    const summaryContent = getElement(
        "summaryContent",
        "resultContent",
        "output"
    );

    if (!summaryContent) {
        showError(
            "لا يوجد نص لنسخه."
        );

        return;
    }


    const text =
        summaryContent.innerText.trim();


    if (!text) {
        showError(
            "لا يوجد ملخص لنسخه."
        );

        return;
    }


    try {

        await navigator.clipboard.writeText(text);

        const copyBtn =
            document.querySelector(".copy-btn");


        if (copyBtn) {

            const oldText =
                copyBtn.textContent;


            copyBtn.textContent =
                "تم النسخ! ✓";


            setTimeout(() => {

                copyBtn.textContent =
                    oldText || "نسخ النص";

            }, 2000);
        }


    } catch (error) {

        console.error(
            "SnapGPT Copy Error:",
            error
        );

        showError(
            "لم نتمكن من نسخ النص."
        );
    }
}


/* ---------------------------------------------------------
   Format AI Result Safely
--------------------------------------------------------- */

function formatSummary(text) {

    if (!text) return "";


    const escaped =
        String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");


    return escaped
        .replace(
            /^\s*[-*]\s+(.*)$/gmi,
            "• $1"
        )
        .replace(
            /\n/g,
            "<br>"
        );
}


/* =========================================================
   SnapGPT Event Listeners
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "SnapGPT: Frontend loaded."
        );


        /* -------------------------------------------------
           Let's Go Button
        ------------------------------------------------- */

        const startButton =
            document.getElementById("start");


        if (startButton) {

            startButton.addEventListener(
                "click",
                () => processVideo("summary")
            );

            console.log(
                "SnapGPT: Let's Go button connected."
            );
        }


        /* -------------------------------------------------
           Summarize Button
        ------------------------------------------------- */

        const summarizeButton =
            document.getElementById("summarize");


        if (
            summarizeButton &&
            summarizeButton !== startButton
        ) {

            summarizeButton.addEventListener(
                "click",
                () => processVideo("summary")
            );

            console.log(
                "SnapGPT: Summarize button connected."
            );
        }


        /* -------------------------------------------------
           Old summarizeBtn compatibility
        ------------------------------------------------- */

        const oldSummarizeButton =
            document.getElementById("summarizeBtn");


        if (
            oldSummarizeButton &&
            oldSummarizeButton !== startButton &&
            oldSummarizeButton !== summarizeButton
        ) {

            oldSummarizeButton.addEventListener(
                "click",
                () => processVideo("summary")
            );
        }


        /* -------------------------------------------------
           Explain Button
        ------------------------------------------------- */

        const explainButton =
            document.getElementById("explain");


        if (explainButton) {

            explainButton.addEventListener(
                "click",
                () => processVideo("explain")
            );

            console.log(
                "SnapGPT: Explain button connected."
            );
        }


        /* -------------------------------------------------
           Copy Button
        ------------------------------------------------- */

        const copyButton =
            document.querySelector(".copy-btn");


        if (copyButton) {

            copyButton.addEventListener(
                "click",
                copyResult
            );
        }


        /* -------------------------------------------------
           Enter Key in YouTube Input
        ------------------------------------------------- */

        const urlInput =
            getElement(
                "videoUrl",
                "youtubeUrl",
                "urlInput"
            );


        if (urlInput) {

            urlInput.addEventListener(
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


/* ---------------------------------------------------------
   Make functions available globally
--------------------------------------------------------- */

window.processVideo = processVideo;
window.copyResult = copyResult;
window.showError = showError;

console.log(
    "SnapGPT: Script initialized."
);
