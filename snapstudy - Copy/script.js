// SnapGPT - YouTube Video Analyzer

async function processVideo() {
    const urlInput = document.getElementById("videoUrl");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const resultArea = document.getElementById("resultArea");
    const summaryContent = document.getElementById("summaryContent");
    const errorMessage = document.getElementById("errorMessage");

    if (!urlInput || !summarizeBtn || !resultArea || !summaryContent || !errorMessage) {
        console.error("SnapGPT: Required HTML elements were not found.");
        return;
    }

    const btnText = summarizeBtn.querySelector(".btn-text");
    const loader = summarizeBtn.querySelector(".loader");

    resultArea.classList.add("hidden");
    errorMessage.classList.add("hidden");
    summaryContent.innerHTML = "";

    const videoUrl = urlInput.value.trim();

    if (!videoUrl) {
        showError("من فضلك، الصق رابط فيديو يوتيوب أولاً.");
        return;
    }

    let youtubeUrl;

    try {
        youtubeUrl = new URL(videoUrl);
    } catch {
        showError("الرابط غير صحيح. تأكد أنك وضعت رابط YouTube صحيح.");
        return;
    }

    const isYouTube =
        youtubeUrl.hostname === "youtube.com" ||
        youtubeUrl.hostname === "www.youtube.com" ||
        youtubeUrl.hostname === "m.youtube.com" ||
        youtubeUrl.hostname === "youtu.be" ||
        youtubeUrl.hostname === "www.youtu.be";

    if (!isYouTube) {
        showError("من فضلك استخدم رابط YouTube فقط.");
        return;
    }

    summarizeBtn.disabled = true;

    if (btnText) {
        btnText.style.opacity = "0";
    }

    if (loader) {
        loader.classList.remove("hidden");
    }

    try {
        const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: videoUrl,
                mode: "summary"
            })
        });

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error("السيرفر رجّع استجابة غير مفهومة.");
        }

        if (!response.ok) {
            throw new Error(
                data?.error ||
                `حدث خطأ من السيرفر (${response.status}).`
            );
        }

        if (!data?.ok) {
            throw new Error(
                data?.error ||
                "السيرفر لم يستطع تحليل الفيديو."
            );
        }

        const finalSummary = data.result || data.summary;

        if (!finalSummary) {
            throw new Error("لم يتم إرجاع ملخص من الذكاء الاصطناعي.");
        }

        summaryContent.innerHTML = formatSummary(finalSummary);
        resultArea.classList.remove("hidden");

        resultArea.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        console.error("SnapGPT Analyze Error:", error);

        showError(
            error?.message ||
            "حدث خطأ أثناء تحليل الفيديو. حاول مرة أخرى."
        );

    } finally {
        summarizeBtn.disabled = false;

        if (btnText) {
            btnText.style.opacity = "1";
        }

        if (loader) {
            loader.classList.add("hidden");
        }
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

    if (!summaryContent) {
        return;
    }

    const text = summaryContent.innerText.trim();

    if (!text) {
        return;
    }

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
    if (!text) {
        return "";
    }

    const escaped = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    return escaped
        .replace(/^\s*[-*]\s+(.*)$/gmi, "• $1")
        .replace(/\n/g, "<br>");
}