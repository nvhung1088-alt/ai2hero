// content-gemini.js - Ai2Hero Bridge Content Script for Gemini Web
console.log('[Ai2Hero Bridge] Gemini Content Script loaded.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'READY', url: window.location.href });
    return true;
  }

  if (request.action === 'PROCESS_AI_JOB') {
    const { prompt, attachments } = request.job;
    processGeminiJob(prompt, attachments)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

async function processGeminiJob(promptText, attachments) {
  // 1. Dò tìm ô nhập liệu (nhiều Selector dự phòng)
  const inputSelectors = [
    'div[contenteditable="true"]',
    '.ql-editor',
    'textarea[aria-label*="prompt"]',
    'textarea[aria-label*="Hỏi"]',
    'textarea[aria-label*="Ask"]',
    '[role="textbox"]'
  ];

  let inputEl = null;
  for (const selector of inputSelectors) {
    const el = document.querySelector(selector);
    if (el && el.offsetParent !== null) { // Element is visible
      inputEl = el;
      break;
    }
  }

  if (!inputEl) {
    throw new Error('Không tìm thấy khung nhập liệu trên giao diện Gemini Web. Đảm bảo bạn đang ở trang chat.');
  }

  // 2. Điền Prompt vào khung nhập
  inputEl.focus();

  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = promptText;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // Contenteditable DIV
    inputEl.innerHTML = `<p>${promptText.replace(/\n/g, '<br>')}</p>`;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Chờ 500ms cho UI cập nhật nút Send
  await new Promise((r) => setTimeout(r, 500));

  // 3. Xử lý đính kèm nếu có (Ảnh/Video)
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    console.log('[Ai2Hero Bridge] Phao đính kèm:', attachments.length);
    // TODO: Hỗ trợ upload ảnh/file qua FileInput DOM nếu cần
  }

  // 4. Dò tìm nút Gửi (Send Button)
  const sendSelectors = [
    'button[aria-label*="Send"]',
    'button[aria-label*="Gửi"]',
    'button.send-button',
    'button[mat-icon-button]',
    'button:has(mat-icon[fonticon*="send"])',
    'button:has(svg)'
  ];

  let sendBtn = null;
  for (const selector of sendSelectors) {
    const btns = document.querySelectorAll(selector);
    for (const btn of btns) {
      if (btn.offsetParent !== null && !btn.disabled) {
        sendBtn = btn;
        break;
      }
    }
    if (sendBtn) break;
  }

  if (!sendBtn) {
    // Thử dùng phím Enter làm fallback
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
  } else {
    sendBtn.click();
  }

  console.log('[Ai2Hero Bridge] Đã bấm Gửi. Đang chờ Gemini sinh câu trả lời...');

  // 5. Chờ câu trả lời từ Gemini (MutationObserver)
  return await waitForGeminiResponse();
}

function waitForGeminiResponse() {
  return new Promise((resolve, reject) => {
    let lastText = '';
    let quietTimer = null;
    const MAX_WAIT_MS = 180000; // Timeout 3 phút cho prompt cực dài

    const responseSelectors = [
      '.model-response-text',
      'message-content',
      '.response-container-content',
      'model-thought',
      '[data-test-id="model-response"]'
    ];

    const getLatestResponseText = () => {
      let elements = [];
      for (const selector of responseSelectors) {
        const els = document.querySelectorAll(selector);
        if (els.length > 0) {
          elements = Array.from(els);
          break;
        }
      }

      if (elements.length === 0) {
        // Fallback: Tìm tất cả thẻ chứa text chính của chat
        elements = Array.from(document.querySelectorAll('p, li, code')).filter((el) => el.innerText.length > 10);
      }

      if (elements.length === 0) return '';
      // Lấy phần tử phản hồi cuối cùng
      const lastEl = elements[elements.length - 1];
      return lastEl.innerText.trim();
    };

    const globalTimeout = setTimeout(() => {
      if (observer) observer.disconnect();
      const text = getLatestResponseText();
      if (text) {
        resolve(text);
      } else {
        reject(new Error('Timeout quá 3 phút không nhận được câu trả lời từ Gemini Web.'));
      }
    }, MAX_WAIT_MS);

    const observer = new MutationObserver(() => {
      const currentText = getLatestResponseText();
      if (currentText && currentText !== lastText) {
        lastText = currentText;
        if (quietTimer) clearTimeout(quietTimer);

        // Đợi 2.5 giây không thấy chữ mới nhảy nữa -> Đã gõ xong
        quietTimer = setTimeout(() => {
          observer.disconnect();
          clearTimeout(globalTimeout);
          resolve(currentText);
        }, 2500);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
}
