// content-chatgpt.js - Ai2Hero Bridge Content Script for ChatGPT Web
console.log('[Ai2Hero Bridge] ChatGPT Content Script loaded.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'READY', url: window.location.href });
    return true;
  }

  if (request.action === 'PROCESS_AI_JOB') {
    const { prompt, attachments } = request.job;
    processChatGPTJob(prompt, attachments)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

async function processChatGPTJob(promptText, attachments) {
  // 1. Dò tìm ô nhập liệu trên ChatGPT
  const inputSelectors = [
    '#prompt-textarea',
    'textarea[placeholder*="Send"]',
    'textarea[placeholder*="Gửi"]',
    'textarea[placeholder*="Ask"]',
    'div[contenteditable="true"]',
    '[role="textbox"]'
  ];

  let inputEl = null;
  for (const selector of inputSelectors) {
    const el = document.querySelector(selector);
    if (el && el.offsetParent !== null) {
      inputEl = el;
      break;
    }
  }

  if (!inputEl) {
    throw new Error('Không tìm thấy khung nhập liệu trên giao diện ChatGPT Web. Đảm bảo bạn đang ở trang chat.');
  }

  // 2. Điền Prompt vào khung nhập
  inputEl.focus();

  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    inputEl.value = promptText;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    inputEl.innerHTML = `<p>${promptText.replace(/\n/g, '<br>')}</p>`;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  await new Promise((r) => setTimeout(r, 600));

  // 3. Xử lý đính kèm nếu có
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    console.log('[Ai2Hero Bridge ChatGPT] Phao đính kèm:', attachments.length);
  }

  // 4. Dò tìm nút Gửi (Send Button)
  const sendSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Gửi"]',
    'button[data-testid="composer-speech-button"] + button',
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
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
  } else {
    sendBtn.click();
  }

  console.log('[Ai2Hero Bridge] Đã bấm Gửi sang ChatGPT. Đang chờ phản hồi...');

  // 5. Chờ câu trả lời từ ChatGPT
  return await waitForChatGPTResponse();
}

function waitForChatGPTResponse() {
  return new Promise((resolve, reject) => {
    let lastText = '';
    let quietTimer = null;
    const MAX_WAIT_MS = 180000;

    const responseSelectors = [
      '[data-message-author-role="assistant"] .markdown',
      '[data-message-author-role="assistant"]',
      '.agent-turn .markdown',
      '.markdown'
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

      if (elements.length === 0) return '';
      const lastEl = elements[elements.length - 1];
      return lastEl.innerText.trim();
    };

    const globalTimeout = setTimeout(() => {
      if (observer) observer.disconnect();
      const text = getLatestResponseText();
      if (text) {
        resolve(text);
      } else {
        reject(new Error('Timeout quá 3 phút không nhận được câu trả lời từ ChatGPT Web.'));
      }
    }, MAX_WAIT_MS);

    const observer = new MutationObserver(() => {
      const currentText = getLatestResponseText();
      if (currentText && currentText !== lastText) {
        lastText = currentText;
        if (quietTimer) clearTimeout(quietTimer);

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
