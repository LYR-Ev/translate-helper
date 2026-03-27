let popup = null;
let lastPointerX = 0;
let lastPointerY = 0;
let latestSelectedText = "";
let latestSelectionRect = null;
let triggerTimer = null;

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
    popup.className = 'translation-popup';
    //给 popup设置HTML 内容，反引号``表示模板字符串，可以写多行
    popup.innerHTML = `
      <div class="translate-header">   
        <span>划词翻译</span>
        <button class="close-btn">X</button>
      </div>
      <div class="translate-body">
        <p><strong>原文：</strong>${text}</p>
        <p><strong>翻译：</strong>这里先显示假翻译 😊</p>
      </div>
    `;
    //将弹窗添加到页面
    document.body.appendChild(popup);
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

    popup.querySelector('.close-btn').addEventListener('click', () => {
        popup.remove();
        popup = null;
    });
}

function removePopup() {
    if (popup) {
        popup.remove();
        popup = null;
    }
}

function readSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return { text: "", rect: null };
    }

    const text = selection.toString().trim();
    if (!text) {
        return { text: "", rect: null };
    }

    let rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
        rect = null;
    }
    return { text, rect };
}

function triggerTranslatePopup() {
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
    if (triggerTimer) clearTimeout(triggerTimer);
    triggerTimer = setTimeout(() => {
        triggerTranslatePopup();
    }, delay);
}

// 实时跟踪选区变化：记录文本和选区矩形
document.addEventListener("selectionchange", () => {
    const { text, rect } = readSelection();
    latestSelectedText = text;
    latestSelectionRect = rect;
});

// 记录鼠标位置
document.addEventListener("pointermove", (e) => {
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
});

// 鼠标/触控抬起后触发弹窗
document.addEventListener("pointerup", (e) => {
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    scheduleTrigger(20);
});

// 键盘选区（Shift + 方向键）后触发
document.addEventListener("keyup", () => {
    scheduleTrigger(20);
});

// 点击空白区域时，如果没有选中文本则关闭弹窗
document.addEventListener("mousedown", (e) => {
    if (popup && popup.contains(e.target)) return;
    setTimeout(() => {
        const { text } = readSelection();
        if (!text) removePopup();
    }, 0);
});