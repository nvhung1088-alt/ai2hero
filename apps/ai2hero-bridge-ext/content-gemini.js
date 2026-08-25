// content-gemini.js - Ai2Hero Browser Bridge Content Script for Google Gemini Web
if (!window.hasAi2HeroBridgeGemini) {
  window.hasAi2HeroBridgeGemini = true;

  console.log('[Ai2Hero Bridge] Gemini Content Script v2.0 (WebSocket + Stop Detection) Loaded.');

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PING') {
      sendResponse({ status: 'READY', url: window.location.href });
      return true;
    }

    if (request.action === 'NEW_CHAT') {
      triggerNewChat()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (request.action === 'PROCESS_AI_JOB') {
      const { prompt, attachments, autoNewChat = true } = request.job;
      processGeminiJob(prompt, attachments, autoNewChat)
        .then((result) => sendResponse({ success: true, result }))
        .catch((err) => {
          console.error('[Ai2Hero Bridge] Job failed:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep channel open for async response
    }
  });

  /**
   * Thao tác gửi prompt và nhận kết quả từ Gemini Web
   */
  async function processGeminiJob(promptText, attachments, autoNewChat = true) {
    // 0. Kiểm tra xem Gemini có đang gặp lỗi popup / đăng nhập không
    checkGeminiErrorBanners();

    // 1. Dò tìm ô nhập liệu trên Gemini Web
    const inputSelectors = [
      'rich-textarea div[contenteditable="true"]',
      'div[contenteditable="true"]',
      '.ql-editor',
      'div[role="textbox"]',
      'textarea[aria-label*="prompt"]',
      'textarea[aria-label*="Hỏi"]',
      'textarea[aria-label*="Ask"]'
    ];

    let inputEl = null;
    for (const selector of inputSelectors) {
      const els = document.querySelectorAll(selector);
      for (const el of els) {
        if (el.offsetParent !== null) {
          inputEl = el;
          break;
        }
      }
      if (inputEl) break;
    }

    if (!inputEl) {
      throw new Error('Không tìm thấy khung nhập liệu trên giao diện Gemini Web. Vui lòng đảm bảo bạn đang ở trang chat và đã đăng nhập.');
    }

    // 2. Xóa đính kèm cũ nếu lượt gửi này không yêu cầu đính kèm
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      const removeButtons = document.querySelectorAll('button[aria-label*="Xóa"], button[aria-label*="Remove"], button[aria-label*="Delete"], button[aria-label*="close"], .remove-button, [data-test-id*="remove-attachment"]');
      removeButtons.forEach((btn) => {
        try { btn.click(); } catch(e) {}
      });
    }

    // 3. Điền Prompt vào khung nhập một cách an toàn và chuẩn xác (kích hoạt Lit/Angular state)
    inputEl.focus();

    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
      inputEl.value = promptText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    } else {
      // Dành cho Rich Contenteditable DIV (Gemini Quill / Lit component)
      inputEl.innerHTML = '';
      const lines = promptText.split('\n');
      for (const line of lines) {
        const p = document.createElement('p');
        if (line && line.trim()) {
          p.textContent = line;
        } else {
          p.appendChild(document.createElement('br'));
        }
        inputEl.appendChild(p);
      }

      // Kích hoạt tất cả các event cần thiết cho Lit, Angular và Quill
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    await new Promise((r) => setTimeout(r, 400));

    // 3. Xử lý đính kèm nếu có (Ảnh/Video)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log(`[Ai2Hero Bridge] Đang dán ${attachments.length} file đính kèm...`);

      for (const attachItem of attachments) {
        let base64Data = null;
        if (typeof attachItem === 'string') {
          base64Data = attachItem;
        } else if (attachItem && attachItem.base64) {
          base64Data = attachItem.base64;
        }

        if (base64Data && base64Data.startsWith('data:')) {
          try {
            const res = await fetch(base64Data);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'png';
            const file = new File([blob], `attachment_${Date.now()}.${ext}`, { type: blob.type });

            const dt = new DataTransfer();
            dt.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dt,
              bubbles: true,
              cancelable: true
            });
            inputEl.dispatchEvent(pasteEvent);

            // Chờ 1.5s để Gemini tải xong chip preview ảnh trước khi bấm gửi
            await new Promise((r) => setTimeout(r, 1500));
          } catch (e) {
            console.warn('[Ai2Hero Bridge] Lỗi dán file đính kèm:', e);
          }
        }
      }
    }

    // 4. Dò tìm nút Gửi (Send Button)
    const sendSelectors = [
      'button.send-button',
      'button[aria-label*="Send message"]',
      'button[aria-label*="Gửi tin nhắn"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Gửi"]',
      'button.send-button-container button',
      'button[mat-icon-button]:has(mat-icon)'
    ];

    let sendBtn = null;
    for (const selector of sendSelectors) {
      const btns = document.querySelectorAll(selector);
      for (const btn of btns) {
        if (btn.offsetParent !== null && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
          sendBtn = btn;
          break;
        }
      }
      if (sendBtn) break;
    }

    if (!sendBtn) {
      console.log('[Ai2Hero Bridge] Dùng phím Enter để gửi prompt...');
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    } else {
      console.log('[Ai2Hero Bridge] Bấm nút Send...');
      sendBtn.click();
    }

    console.log('[Ai2Hero Bridge] Đã gửi lệnh. Bắt đầu lắng nghe phản hồi Gemini theo Stop-Button Lifecycle...');

    // 5. Lắng nghe phản hồi từ Gemini
    const result = await waitForGeminiResponseLifecycle();

    // 6. Dọn dẹp RAM / Phiên chat mới nếu được yêu cầu
    if (autoNewChat) {
      setTimeout(() => {
        triggerNewChat().catch((e) => console.warn('[Ai2Hero Bridge] Auto New Chat error:', e));
      }, 500);
    }

    return result;
  }

  /**
   * Theo dõi vòng đời sinh nội dung của Gemini dựa trên Nút Stop & MutationObserver
   */
  function waitForGeminiResponseLifecycle() {
    return new Promise((resolve, reject) => {
      const MAX_TIMEOUT_MS = 180000; // 3 phút timeout
      let hasStartedGenerating = false;
      let lastExtractedText = '';
      let finishDebounceTimer = null;

      // Selectors nhận diện nút Stop (đang sinh text)
      const isStopButtonVisible = () => {
        const stopSelectors = [
          'button[aria-label*="Stop"]',
          'button[aria-label*="Dừng"]',
          'button[aria-label*="Cancel"]',
          'button[aria-label*="Hủy"]',
          'mat-icon[fonticon*="stop"]',
          '.stop-icon',
          '[data-test-id="stop-button"]'
        ];

        for (const sel of stopSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            if (el.offsetParent !== null) return true;
          }
        }
        return false;
      };

      // Hàm trích xuất text sạch (LOẠI BỎ HOÀN TOÀN THẺ SUY NGHĨ / MODEL THOUGHT)
      const extractCleanResponse = () => {
        const responseContainers = [
          'message-content',
          '.model-response-text',
          '.response-container-content',
          '[data-test-id="model-response"]',
          '.markdown-main-panel'
        ];

        let elements = [];
        for (const sel of responseContainers) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) {
            elements = Array.from(els);
            break;
          }
        }

        if (elements.length === 0) {
          elements = Array.from(document.querySelectorAll('p, li, code')).filter((el) => el.innerText.length > 10);
        }

        if (elements.length === 0) return '';

        // Lấy lượt phản hồi cuối cùng của mô hình
        const lastEl = elements[elements.length - 1];

        // Clone node để lọc sạch các thẻ rác mà không làm ảnh hưởng DOM trang web
        const clone = lastEl.cloneNode(true);

        // LOẠI BỎ TRIỆT ĐỂ: Thẻ suy nghĩ (model-thought, thought-container)
        const thoughts = clone.querySelectorAll('model-thought, .thought-container, .thinking-content, [data-test-id="model-thought"], .model-thought-container');
        thoughts.forEach((t) => t.remove());

        // Bóc tách ảnh sinh ra (nếu có)
        const images = clone.querySelectorAll('img:not([alt*="avatar"]):not([alt*="logo"]):not([src*="googleusercontent.com/a/"])');
        let imgMarkdown = '';
        if (images.length > 0) {
          images.forEach((img) => {
            if (img.src && !img.src.startsWith('data:image/svg')) {
              imgMarkdown += `\n![Image](${img.src})\n`;
            }
          });
        }

        const cleanText = (clone.innerText || clone.textContent || '').trim();
        return (cleanText + imgMarkdown).trim();
      };

      // Timeout bảo vệ
      const globalTimeout = setTimeout(() => {
        if (observer) observer.disconnect();
        if (intervalCheck) clearInterval(intervalCheck);
        const finalCheck = extractCleanResponse();
        if (finalCheck) {
          resolve(finalCheck);
        } else {
          reject(new Error('Timeout 3 phút: Không nhận được câu trả lời từ Gemini Web.'));
        }
      }, MAX_TIMEOUT_MS);

      // Định kỳ kiểm tra trạng thái nút Stop và tiến trình sinh text (chu kỳ 350ms)
      const intervalCheck = setInterval(() => {
        const isGenerating = isStopButtonVisible();
        const currentText = extractCleanResponse();

        if (isGenerating || currentText.length > 10) {
          hasStartedGenerating = true;
          if (finishDebounceTimer && isGenerating) {
            clearTimeout(finishDebounceTimer);
            finishDebounceTimer = null;
          }
        }

        if (hasStartedGenerating && !isGenerating) {
          // Nút Stop không còn / hoặc đã dứt câu -> Đợi 800ms debounce để lấy trọn vẹn câu cuối
          if (!finishDebounceTimer) {
            finishDebounceTimer = setTimeout(() => {
              const resultText = extractCleanResponse();
              if (resultText && resultText.trim().length > 0) {
                if (observer) observer.disconnect();
                clearInterval(intervalCheck);
                clearTimeout(globalTimeout);

                console.log('[Ai2Hero Bridge] Gemini đã sinh xong hoàn tất 100%!');
                resolve(resultText);
              }
            }, 800);
          }
        }
      }, 350);

      // MutationObserver theo dõi thay đổi DOM
      const observer = new MutationObserver(() => {
        const text = extractCleanResponse();
        if (text && text !== lastExtractedText) {
          lastExtractedText = text;
          if (text.length > 10) {
            hasStartedGenerating = true;
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

  /**
   * Tự động tạo cuộc trò chuyện mới (New Chat) để giải phóng RAM
   */
  async function triggerNewChat() {
    console.log('[Ai2Hero Bridge] Đang làm mới phiên chat (New Chat)...');
    const newChatSelectors = [
      'button[aria-label*="Cuộc trò chuyện mới"]',
      'button[aria-label*="New chat"]',
      'a[aria-label*="Cuộc trò chuyện mới"]',
      'a[aria-label*="New chat"]',
      '.new-chat-button',
      '[data-test-id="new-chat-button"]'
    ];

    for (const sel of newChatSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        el.click();
        await new Promise((r) => setTimeout(r, 600));
        return;
      }
    }
  }

  /**
   * Kiểm tra xem trang có đang bị chặn bởi lỗi hoặc cảnh báo không
   */
  function checkGeminiErrorBanners() {
    const pageText = document.body.innerText || '';
    if (pageText.includes('Đăng nhập vào tài khoản Google') || pageText.includes('Sign in to Gemini')) {
      throw new Error('Vui lòng đăng nhập vào tài khoản Google trên tab Gemini trước khi sử dụng.');
    }
  }
}
