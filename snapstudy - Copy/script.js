async function processVideo() {
    const urlInput = document.getElementById("videoUrl");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const resultArea = document.getElementById("resultArea");
    const summaryContent = document.getElementById("summaryContent");
    const errorMessage = document.getElementById("errorMessage");

    if (!urlInput || !summarizeBtn || !resultArea || !summaryContent || !errorMessage) {
        console.error("SnapGPT: Required elements are missing.");
        return;
    }

    const btnText = summarizeBtn.querySelector(".btn-text");
    const loader = summarizeBtn.querySelector(".loader");

    const videoUrl = urlInput.value.trim();

    resultArea.classList.add("hidden");
    errorMessage.classList.add("hidden");
    summaryContent.innerHTML = "";

    if (!videoUrl) {
        showError("من فضلك، الصق رابط فيديو يوتيوب أولاً.");
        return;
    }

    try {
        new URL(videoUrl);
    } catch {
        showError("رابط YouTube غير صحيح.");
        return;
    }

    summarizeBtn.disabled = true;

    if (btnText) btnText.style.opacity = "0";
    if (loader) loader.classList.remove("hidden");

    try {
        // 1. Get YouTube transcript
        const transcriptResponse = await fetch("/api/transcript", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: videoUrl
            })
        });

        const transcriptData = await transcriptResponse.json();

        if (!transcriptResponse.ok || !transcriptData.ok) {
            throw new Error(
                transcriptData.error ||
                "Could not get the video transcript."
            );
        }

        const transcript = transcriptData.transcript;

        if (!transcript) {
            throw new Error("No transcript was found for this video.");
        }

        // 2. Send transcript to AI
        const analyzeResponse = await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                transcript: transcript,
                mode: "summary"
            })
        });

        const analyzeData = await analyzeResponse.json();

        if (!analyzeResponse.ok || !analyzeData.ok) {
            throw new Error(
                analyzeData.error ||
                "The AI could not analyze the transcript."
            );
        }

        const result = analyzeData.result || analyzeData.summary;

        if (!result) {
            throw new Error("The AI returned no summary.");
        }

        summaryContent.innerHTML = formatSummary(result);
        resultArea.classList.remove("hidden");

        resultArea.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        console.error("SnapGPT Error:", error);

        showError(
            error.message ||
            "Something went wrong. Please try again."
        );

    } finally {
        summarizeBtn.disabled = false;

        if (btnText) btnText.style.opacity = "1";
        if (loader) loader.classList.add("hidden");
    }
}


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


function copyResult() {
    const summaryContent = document.getElementById("summaryContent");

    if (!summaryContent) return;

    const text = summaryContent.innerText.trim();

    if (!text) return;

    navigator.clipboard.writeText(text)
        .then(() => {
            const copyBtn = document.querySelector(".copy-btn");

            if (copyBtn) {
                const oldText = copyBtn.textContent;

                copyBtn.textContent = "تم النسخ!";

                setTimeout(() => {
                    copyBtn.textContent = oldText || "نسخ النص";
                }, 2000);
            }
        })
        .catch(() => {
            showError("لم نتمكن من نسخ النص.");
        });
}


function formatSummary(text) {
    if (!text) return "";

    const escaped = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return escaped
        .replace(/^\s*[-*]\s+(.*)$/gmi, "• $1")
        .replace(/\n/g, "<br>");
}
