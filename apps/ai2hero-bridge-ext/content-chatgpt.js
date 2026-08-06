if (!window.hasAi2HeroBridgeChatGPT) {
  window.hasAi2HeroBridgeChatGPT = true;

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
    // Dành cho ChatGPT mới dùng contenteditable
    inputEl.innerHTML = ''; // Clear text
    document.execCommand('insertText', false, promptText);
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  await new Promise((r) => setTimeout(r, 600));

  // 3. Xử lý đính kèm nếu có
  if (attachments && Array.isArray(attachments) && attachments.length > 0) {
    console.log(`[Ai2Hero Bridge ChatGPT] Xử lý ${attachments.length} đính kèm...`);
    
    for (const attachBase64 of attachments) {
      if (typeof attachBase64 === 'string' && attachBase64.startsWith('data:')) {
        try {
          const res = await fetch(attachBase64);
          const blob = await res.blob();
          const file = new File([blob], "attachment.png", { type: blob.type });

          const dt = new DataTransfer();
          dt.items.add(file);

          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true
          });
          inputEl.dispatchEvent(pasteEvent);
          await new Promise(r => setTimeout(r, 1000)); // Đợi ChatGPT xử lý ảnh upload
        } catch (e) {
          console.warn('[Ai2Hero Bridge] Không thể dán ảnh đính kèm:', e);
        }
      }
    }
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
  return await waitForChatGPTResponse(promptText);
}

function waitForChatGPTResponse(promptText = '') {
  return new Promise(async (resolve, reject) => {
    let lastText = '';
    let quietTimer = null;
    
    // Đọc hiểu ý đồ để phân bổ thời gian đợi an toàn
    const textLower = promptText.toLowerCase();
    const isImageGen = textLower.includes('thiết kế') || textLower.includes('thumbnail') || textLower.includes('ảnh') || textLower.includes('image');
    
    // 1. CHỜ MÙ (Initial Wait): Bắt buộc đứng im không cào DOM để tránh nhầm DOM cũ
    const initialWait = isImageGen ? 45000 : 10000; // 45s cho ảnh, 10s cho dịch
    console.log(`[Ai2Hero Bridge] Bắt buộc chờ ${initialWait/1000}s cho AI xử lý trước khi theo dõi...`);
    await new Promise(r => setTimeout(r, initialWait));
    console.log(`[Ai2Hero Bridge] Hết thời gian chờ bắt buộc, bắt đầu theo dõi DOM...`);

    const MAX_WAIT_MS = 240000;
    const quietWait = isImageGen ? 15000 : 5000;

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
      
      // Kiểm tra xem có ảnh sinh ra không
      const images = lastEl.querySelectorAll('img:not([alt*="avatar"]):not([alt*="logo"])');
      let imgMarkdown = '';
      if (images.length > 0) {
        images.forEach(img => {
          // Lấy src, lưu ý src gốc của DALL-E có thể ở attribute khác, nhưng chuẩn thường là src
          if (img.src && !img.src.startsWith('data:image/svg')) {
             imgMarkdown += `![Image](${img.src})\n`;
          }
        });
      }

      return (lastEl.innerText.trim() + '\n' + imgMarkdown).trim();
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

        // Đợi không thấy chữ mới nhảy nữa -> Đã gõ/sinh xong
        quietTimer = setTimeout(() => {
          observer.disconnect();
          clearTimeout(globalTimeout);
          resolve(currentText);
        }, quietWait);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
}
}
