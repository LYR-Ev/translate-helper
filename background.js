const BACKEND_URL = "http://127.0.0.1:3001/translate";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "TRANSLATE_TEXT") {
        return;
    }

    (async () => {
        try {
            const text = (message.text || "").trim();
            if (!text) {
                sendResponse({ ok: false, error: "empty_text" });
                return;
            }

            const url = `${BACKEND_URL}?q=${encodeURIComponent(text)}`;
            const res = await fetch(url);
            if (!res.ok) {
                sendResponse({ ok: false, error: `http_${res.status}` });
                return;
            }

            const data = await res.json();
            const translatedText = data?.translatedText || data?.translation || "";
            if (!translatedText) {
                sendResponse({ ok: false, error: "invalid_payload" });
                return;
            }

            sendResponse({ ok: true, translatedText });
        } catch (err) {
            sendResponse({ ok: false, error: err?.message || "network_error" });
        }
    })();

    return true;
});
