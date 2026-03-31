let popup = null;
let lastPointerX = 0;
let lastPointerY = 0;
let latestSelectedText = "";
let latestSelectionRect = null;
let triggerTimer = null;
let suppressAutoOpenUntil = 0;

function isAutoOpenSuppressed() {
    return Date.now() < suppressAutoOpenUntil;
}

async function translateText(text) {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("翻译接口返回：", data);
        return data.responseData?.translatedText || "翻译失败";
    } catch (err) {
        console.error("翻译出错:", err);
        return "翻译出错";
    }
}

//创建弹窗
function createPopup(text, x, y) {
    //若有旧弹窗，则删除
    if (popup) {
        popup.remove();
    }
    //创建新弹窗,popup 现在指向一个新建的 div
    popup = document.createElement('div');
    //给 popup 设置 CSS 类名为 translation-popup
    //样式在 style.css 中用 .translation-popup { ... } 定义
    popup.className = 'translate-popup';
    //给 popup设置HTML 内容，反引号``表示模板字符串，可以写多行
    popup.innerHTML = `
      <div class="translate-header">   
        <span>划词翻译</span>
        <button class="close-btn">X</button>
      </div>
      <div class="translate-body">
        <p><strong>原文：</strong>${text}</p>
        <p><strong>翻译：</strong><span class="result">翻译中...</span></p>
      </div>
    `;
    //将弹窗添加到页面
    document.body.appendChild(popup);

    const resultEl = popup.querySelector(".result");
    translateText(text).then((translated) => {
        if (popup && resultEl && document.body.contains(resultEl)) {
            resultEl.textContent = translated;
        }
    });

    const gap = 10;
    const popupWidth = popup.offsetWidth || 280;
    const popupHeight = popup.offsetHeight || 120;

    // 边界修正，避免弹窗超出可视区
    let finalX = x + gap;
    let finalY = y + gap;
    if (finalX + popupWidth > window.innerWidth - gap) {
        finalX = window.innerWidth - popupWidth - gap;
    }
    if (finalY + popupHeight > window.innerHeight - gap) {
        finalY = y - popupHeight - gap;
    }
    if (finalX < gap) finalX = gap;
    if (finalY < gap) finalY = gap;

    popup.style.left = `${finalX}px`;
    popup.style.top = `${finalY}px`;

    const closeBtn = popup.querySelector('.close-btn');
    closeBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        suppressAutoOpenUntil = Date.now() + 800;
    });
    closeBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        suppressAutoOpenUntil = Date.now() + 800;
    });
    closeBtn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        e.stopPropagation();
        suppressAutoOpenUntil = Date.now() + 800;
    });
    closeBtn.addEventListener("mouseup", (e) => {
        e.preventDefault();
        e.stopPropagation();
        suppressAutoOpenUntil = Date.now() + 800;
    });
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();//阻止默认行为，否则点击关闭按钮会刷新页面
        e.stopPropagation();//阻止事件继续向父级冒泡，否则可能继续传到 监听器（mouseup/pointerup），又触发弹窗逻辑
        closePopupAndSuppressReopen();
    });
}

function removePopup() {
    if (popup) {
        popup.remove();
        popup = null;
    }
}

function closePopupAndSuppressReopen() {
    suppressAutoOpenUntil = Date.now() + 800;
    latestSelectedText = "";
    latestSelectionRect = null;
    if (triggerTimer) {
        clearTimeout(triggerTimer);
        triggerTimer = null;
    }
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();

    const activeEl = document.activeElement;
    if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
    ) {
        try {
            activeEl.setSelectionRange(0, 0);
        } catch (_) {
            // ignore selection reset errors on unsupported input types
        }
    }
    removePopup();
}

function readSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
        const text = selection.toString().trim();
        if (text) {
            let rect = selection.getRangeAt(0).getBoundingClientRect();
            if (!rect || (rect.width === 0 && rect.height === 0)) {
                rect = null;
            }
            return { text, rect };
        }
    }

    // 兼容 input/textarea 内的选中内容
    const activeEl = document.activeElement;
    if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
    ) {
        const start = activeEl.selectionStart ?? 0;
        const end = activeEl.selectionEnd ?? 0;
        const value = activeEl.value ?? "";
        const text = value.slice(start, end).trim();
        if (text) {
            const rect = activeEl.getBoundingClientRect();
            return { text, rect };
        }
    }

    return { text: "", rect: null };
}

function triggerTranslatePopup() {
    if (isAutoOpenSuppressed()) return;

    // 触发时再主动读一次，避免事件时序导致拿到旧值
    const fresh = readSelection();
    latestSelectedText = fresh.text;
    latestSelectionRect = fresh.rect;

    const text = latestSelectedText;
    if (!text) {
        removePopup();
        return;
    }

    let anchorX = lastPointerX;
    let anchorY = lastPointerY;
    if (latestSelectionRect) {
        anchorX = latestSelectionRect.right;
        anchorY = latestSelectionRect.bottom;
    }
    createPopup(text, anchorX, anchorY);
}

function scheduleTrigger(delay = 30) {
    if (isAutoOpenSuppressed()) return;
    if (triggerTimer) clearTimeout(triggerTimer);
    triggerTimer = setTimeout(() => {
        if (isAutoOpenSuppressed()) return;
        triggerTranslatePopup();
    }, delay);
}

// 实时跟踪选区变化：记录文本和选区矩形
document.addEventListener("selectionchange", () => {
    if (isAutoOpenSuppressed()) return;
    const { text, rect } = readSelection();
    latestSelectedText = text;
    latestSelectionRect = rect;
});

// 记录鼠标位置,记录原因：未知
document.addEventListener("pointermove", (e) => {
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
});

// 鼠标/触控抬起后触发弹窗
document.addEventListener("pointerup", (e) => {
    if (isAutoOpenSuppressed()) return;
    if (popup && popup.contains(e.target)) return;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    scheduleTrigger(20);
});

// 兼容仅触发 mouseup 的页面
document.addEventListener("mouseup", (e) => {
    if (isAutoOpenSuppressed()) return;
    if (popup && popup.contains(e.target)) return;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    scheduleTrigger(20);
});

// 键盘选区（Shift + 方向键）后触发
document.addEventListener("keyup", () => {
    if (isAutoOpenSuppressed()) return;
    scheduleTrigger(20);
});

// 点击空白区域时，如果没有选中文本则关闭弹窗
document.addEventListener("mousedown", (e) => {
    if (isAutoOpenSuppressed()) return;
    if (popup && popup.contains(e.target)) return;
    setTimeout(() => {
        const { text } = readSelection();
        if (!text) removePopup();
    }, 0);
});


