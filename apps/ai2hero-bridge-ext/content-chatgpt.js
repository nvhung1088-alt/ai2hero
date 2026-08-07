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
      return true;
    }
  });

  // Kiểm tra Đăng nhập: Dựa vào sự TỒN TẠI của khung chat
  function checkAuthStatus() {
    // Nếu URL là trang đăng nhập -> chưa đăng nhập
    if (window.location.href.includes('/auth/login') || window.location.href.includes('/login')) {
      return true;
    }
    // Nếu không tìm thấy khung chat nào -> chưa đăng nhập
    const inputSelectors = [
      '#prompt-textarea',
      'textarea[placeholder]',
      'div[contenteditable="true"]',
      '[role="textbox"]'
    ];
    const hasChatInput = inputSelectors.some(sel => {
      const el = document.querySelector(sel);
      return el && el.offsetParent !== null;
    });
    return !hasChatInput;
  }

  // Nén ảnh bằng Canvas API
  function compressImage(base64Url, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
    return new Promise((resolve) => {
      if (!base64Url || !base64Url.startsWith('data:image')) {
        return resolve(base64Url);
      }
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(base64Url);
      img.src = base64Url;
    });
  }

  async function processChatGPTJob(promptText, attachments) {
    // 1. Kiểm tra trạng thái Đăng nhập
    if (checkAuthStatus()) {
      throw new Error('AUTH_REQUIRED');
    }

    // 2. Dò tìm ô nhập liệu trên ChatGPT
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
      throw new Error('Không tìm thấy khung nhập liệu trên giao diện ChatGPT. Hãy đăng nhập và thử lại.');
    }

    // Chụp baseline văn bản cũ trước khi thực thi
    const baselineText = getLatestResponseText();

    inputEl.focus();

    // 3. Xử lý tải ảnh đính kèm (Thumbnail)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log(`[Ai2Hero Bridge] Đang chuẩn bị gửi ${attachments.length} đính kèm...`);
      const fileInput = document.querySelector('input[type="file"]');
      
      if (fileInput) {
        for (const attachBase64 of attachments) {
          try {
            console.log('[Ai2Hero Bridge] Đang nén ảnh thumbnail...');
            const compressedBase64 = await compressImage(attachBase64, 1920, 1080, 0.85);
            
            const res = await fetch(compressedBase64);
            const blob = await res.blob();
            const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });

            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            console.log('[Ai2Hero Bridge] Đã đính kèm ảnh thành công qua file input.');
            await new Promise(r => setTimeout(r, 2000)); // Chờ upload
          } catch (e) {
            console.warn('[Ai2Hero Bridge] Lỗi tải ảnh qua input:', e.message);
          }
        }
      } else {
        console.warn('[Ai2Hero Bridge] Không thấy input[type=file], thử dùng Clipboard Paste làm fallback...');
        for (const attachBase64 of attachments) {
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
            await new Promise(r => setTimeout(r, 1500));
          } catch (e) {
            console.warn('[Ai2Hero Bridge] Lỗi dán ảnh fallback:', e.message);
          }
        }
      }
    }

    // 4. Nhập prompt
    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.value = promptText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      inputEl.innerHTML = '';
      document.execCommand('insertText', false, promptText);
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await new Promise((r) => setTimeout(r, 600));

    // 5. Dò tìm nút Gửi (Send Button)
    const sendSelectors = [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Gửi"]',
      'button.send-button',
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

    console.log('[Ai2Hero Bridge] Đã bấm Gửi. Đang chờ ChatGPT sinh câu trả lời...');

    // 6. Chờ phản hồi v2
    return await waitForChatGPTResponse(promptText, baselineText);
  }

  const responseSelectors = [
    '[data-message-author-role="assistant"] .markdown',
    '[data-message-author-role="assistant"]',
    '.agent-turn .markdown',
    '.markdown'
  ];

  function getLatestResponseText() {
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
    
    // Quét ảnh kết quả
    const images = lastEl.querySelectorAll('img:not([alt*="avatar"]):not([alt*="logo"])');
    let imgMarkdown = '';
    images.forEach(img => {
      if (img.src && !img.src.startsWith('data:image/svg')) {
         imgMarkdown += `![Image](${img.src})\n`;
      }
    });
    
    return (lastEl.innerText.trim() + '\n' + imgMarkdown).trim();
  }

  function waitForChatGPTResponse(promptText = '', baselineText = '') {
    return new Promise((resolve, reject) => {
      let lastText = '';
      let quietTimer = null;
      const MAX_WAIT_MS = 240000; // 4 phút timeout cứng
      
      const textLower = promptText.toLowerCase();
      const isImageGen = textLower.includes('thiết kế') || textLower.includes('thumbnail') || textLower.includes('ảnh') || textLower.includes('image');
      
      const quietWait = isImageGen ? 15000 : 3000;

      const globalTimeout = setTimeout(() => {
        if (observer) observer.disconnect();
        const text = getLatestResponseText();
        if (text && text !== baselineText) {
          resolve(text);
        } else {
          reject(new Error('Timeout quá 4 phút không nhận được câu trả lời từ ChatGPT Web.'));
        }
      }, MAX_WAIT_MS);

      const observer = new MutationObserver(() => {
        const currentText = getLatestResponseText();
        
        if (currentText && currentText !== baselineText) {
          
          // Trạng thái nút Stop Generating biến mất / nút Send sáng lại
          const stopBtn = document.querySelector('button[aria-label*="Stop"], button[data-testid*="stop"], button:has(rect)');
          const sendBtn = document.querySelector('button[data-testid="send-button"]');
          
          if (!stopBtn && sendBtn && !sendBtn.disabled && currentText !== lastText) {
             console.log('[Ai2Hero Bridge] Phát hiện nút Stop biến mất và nút Send kích hoạt trở lại. ChatGPT hoàn tất.');
             observer.disconnect();
             clearTimeout(globalTimeout);
             resolve(currentText);
             return;
          }

          if (currentText !== lastText) {
            lastText = currentText;
            if (quietTimer) clearTimeout(quietTimer);
            
            quietTimer = setTimeout(() => {
              observer.disconnect();
              clearTimeout(globalTimeout);
              resolve(currentText);
            }, quietWait);
          }
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
