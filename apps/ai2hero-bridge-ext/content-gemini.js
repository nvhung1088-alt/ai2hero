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

    // 2. Xóa TẤT CẢ các file đính kèm / preview chips cũ còn nằm trong khung nhập trước khi xử lý
    const allRemoveBtns = document.querySelectorAll(
      'button[aria-label*="Xóa"], button[aria-label*="Remove"], button[aria-label*="Delete"], button[aria-label*="close"], .remove-button, [data-test-id*="remove-attachment"], mat-chip button, .uploader-preview button, button[aria-label*="Hủy"], button[aria-label*="Clear"]'
    );
    allRemoveBtns.forEach((btn) => {
      try { btn.click(); } catch(e) {}
    });
    await new Promise((r) => setTimeout(r, 200));

    // 3. Nếu có file đính kèm (Ảnh): DÁN ẢNH TRƯỚC
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log(`[Ai2Hero Bridge] Đang dán ${attachments.length} file đính kèm trước...`);

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
            const file = new File([blob], `thumb_${Date.now()}.${ext}`, { type: blob.type });

            const dt = new DataTransfer();
            dt.items.add(file);

            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dt,
              bubbles: true,
              cancelable: true
            });
            inputEl.dispatchEvent(pasteEvent);

            // Chờ 2 giây để Gemini upload và gắn chip preview ảnh xong xuôi
            await new Promise((r) => setTimeout(r, 2000));
          } catch (e) {
            console.warn('[Ai2Hero Bridge] Lỗi dán file đính kèm:', e);
          }
        }
      }
    }

    // 4. SAU ĐÓ MỚI ĐIỀN TEXT PROMPT VÀO KHUNG NHẬP (Để không bị mất text khi dán ảnh)
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

    await new Promise((r) => setTimeout(r, 600));

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

    // 5. Lắng nghe phản hồi từ Gemini (Phân biệt rõ Image Job và Text Job)
    const isImageJob = (attachments && Array.isArray(attachments) && attachments.length > 0) || promptText.includes('ảnh bìa') || promptText.includes('thumbnail');
    console.log(`[Ai2Hero Bridge] Bắt đầu lắng nghe phản hồi Gemini (Tác vụ: ${isImageJob ? 'TẠO ẢNH / IMAGE JOB' : 'TEXT ONLY'})...`);
    const result = await waitForGeminiResponseLifecycle(isImageJob);

    // 6. Dọn dẹp RAM / Phiên chat mới nếu được yêu cầu
    if (autoNewChat) {
      setTimeout(() => {
        triggerNewChat().catch((e) => console.warn('[Ai2Hero Bridge] Auto New Chat error:', e));
      }, 500);
    }

    return result;
  }

  /**
   * Theo dõi vòng đời sinh nội dung của Gemini dựa trên Nút Stop, Loading Spinner & MutationObserver
   */
  function waitForGeminiResponseLifecycle(isImageJob = false) {
    return new Promise((resolve, reject) => {
      const MAX_TIMEOUT_MS = isImageJob ? 180000 : 120000; // 3 phút cho ảnh, 2 phút cho text
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

      // Selectors nhận diện Spinner / Loading khi đang sinh ảnh Imagen 3
      const isGeneratingImage = () => {
        const loadingEls = document.querySelectorAll(
          'mat-progress-spinner, .image-placeholder, .sparkle-container, [aria-busy="true"], .loading-spinner, .generating-image, image-loading-indicator, [data-test-id*="loading"]'
        );
        for (const el of loadingEls) {
          if (el.offsetParent !== null) return true;
        }
        return false;
      };

      // Lấy phần tử model-response cuối cùng (chỉ câu trả lời của AI, không lấy user query)
      const getLatestModelResponseElement = () => {
        const modelResponses = document.querySelectorAll(
          'model-response, [data-test-id="model-response"], .model-response'
        );
        if (modelResponses.length > 0) {
          return modelResponses[modelResponses.length - 1];
        }
        return null;
      };

      // Tìm kiếm phần tử ảnh đã render hoàn tất trong câu trả lời cuối cùng
      const findCompletedGeneratedImage = () => {
        const lastEl = getLatestModelResponseElement();
        if (!lastEl) return null;

        const imgEls = lastEl.querySelectorAll('img');
        for (const img of imgEls) {
          const src = img.src || '';
          if (
            src &&
            !src.startsWith('data:image/svg') &&
            !src.includes('/avatar') &&
            !src.includes('googleusercontent.com/a/') &&
            !img.closest('user-query') &&
            !img.closest('.attachment-preview') &&
            (img.naturalWidth >= 150 || img.width >= 150 || src.startsWith('data:image') || src.includes('googleusercontent.com'))
          ) {
            return img;
          }
        }
        return null;
      };

      // Hàm trích xuất text sạch
      const extractCleanResponse = () => {
        const lastEl = getLatestModelResponseElement();
        if (!lastEl) return '';

        const clone = lastEl.cloneNode(true);

        // Loại bỏ thẻ suy nghĩ
        const thoughts = clone.querySelectorAll('model-thought, .thought-container, .thinking-content, [data-test-id="model-thought"], .model-thought-container');
        thoughts.forEach((t) => t.remove());

        return (clone.innerText || clone.textContent || '').trim();
      };

      // Chuyển đổi ảnh sang Base64 an toàn không bị chặn 403
      async function convertImgToBase64Safe(imgEl) {
        if (!imgEl || !imgEl.src) return '';
        if (imgEl.src.startsWith('data:image/')) return imgEl.src;

        // Cách 1: Fetch blob từ ngữ cảnh tab Gemini
        try {
          const res = await fetch(imgEl.src, { credentials: 'include' });
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size > 2000) {
              return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(imgEl.src);
                reader.readAsDataURL(blob);
              });
            }
          }
        } catch (e) {
          console.warn('[Ai2Hero Bridge] Fetch blob failed, fallback canvas:', e);
        }

        // Cách 2: Vẽ lên canvas
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgEl.naturalWidth || 1024;
          canvas.height = imgEl.naturalHeight || 1024;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          if (dataUrl && dataUrl.length > 2000) {
            return dataUrl;
          }
        } catch (e) {
          console.warn('[Ai2Hero Bridge] Canvas conversion failed:', e);
        }

        return imgEl.src;
      }

      async function buildFinalResult() {
        const text = extractCleanResponse();
        const lastEl = getLatestModelResponseElement();
        let finalImgMarkdown = '';
        if (lastEl) {
          const imgEls = lastEl.querySelectorAll('img:not([alt*="avatar"]):not([alt*="logo"]):not([src*="googleusercontent.com/a/"])');
          for (const imgEl of imgEls) {
            if (imgEl.src && !imgEl.src.startsWith('data:image/svg') && !imgEl.closest('user-query') && !imgEl.closest('.attachment-preview')) {
              const b64Url = await convertImgToBase64Safe(imgEl);
              if (b64Url) {
                finalImgMarkdown += `\n![Image](${b64Url})\n`;
              }
            }
          }
        }
        return (text + finalImgMarkdown).trim();
      }

      // Timeout bảo vệ
      const globalTimeout = setTimeout(async () => {
        if (observer) observer.disconnect();
        if (intervalCheck) clearInterval(intervalCheck);
        const finalCheck = await buildFinalResult();
        if (finalCheck) {
          resolve(finalCheck);
        } else {
          reject(new Error('Timeout: Không nhận được câu trả lời từ Gemini Web.'));
        }
      }, MAX_TIMEOUT_MS);

      // Chu kỳ kiểm tra định kỳ (350ms)
      const intervalCheck = setInterval(() => {
        const isGenerating = isStopButtonVisible() || (isImageJob && isGeneratingImage());
        const currentText = extractCleanResponse();
        const foundImage = findCompletedGeneratedImage();

        if (isImageJob) {
          // ĐỐI VỚI TÁC VỤ ẢNH: BẮT BUỘC ĐỢI ẢNH XUẤT HIỆN
          if (foundImage) {
            hasStartedGenerating = true;
            if (!finishDebounceTimer) {
              finishDebounceTimer = setTimeout(async () => {
                const resultText = await buildFinalResult();
                if (resultText && resultText.trim().length > 0) {
                  if (observer) observer.disconnect();
                  clearInterval(intervalCheck);
                  clearTimeout(globalTimeout);

                  console.log('[Ai2Hero Bridge] Gemini đã sinh ảnh xong hoàn tất 100%!');
                  resolve(resultText);
                }
              }, 1200);
            }
          } else {
            // Nếu chưa thấy ảnh mà đang sinh hoặc mới bắt đầu -> tiếp tục đợi
            if (isGenerating) {
              hasStartedGenerating = true;
              if (finishDebounceTimer) {
                clearTimeout(finishDebounceTimer);
                finishDebounceTimer = null;
              }
            }
          }
        } else {
          // ĐỐI VỚI TÁC VỤ TEXT
          if (isGenerating || currentText.length > 10) {
            hasStartedGenerating = true;
            if (finishDebounceTimer && isGenerating) {
              clearTimeout(finishDebounceTimer);
              finishDebounceTimer = null;
            }
          }

          if (hasStartedGenerating && !isGenerating) {
            if (!finishDebounceTimer) {
              finishDebounceTimer = setTimeout(async () => {
                const resultText = await buildFinalResult();
                if (resultText && resultText.trim().length > 0) {
                  if (observer) observer.disconnect();
                  clearInterval(intervalCheck);
                  clearTimeout(globalTimeout);

                  console.log('[Ai2Hero Bridge] Gemini đã sinh text xong hoàn tất 100%!');
                  resolve(resultText);
                }
              }, 800);
            }
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
      'a[href="/app"]',
      'a[href="/"]',
      'button[aria-label*="Cuộc trò chuyện mới"]',
      'button[aria-label*="New chat"]',
      'div[role="button"][aria-label*="Cuộc trò chuyện mới"]',
      'div[role="button"][aria-label*="New chat"]',
      'a[aria-label*="Cuộc trò chuyện mới"]',
      'a[aria-label*="New chat"]',
      '.new-chat-button',
      '[data-test-id="new-chat-button"]',
      'side-nav a[href*="app"]',
      'bard-sidenav button'
    ];

    for (const sel of newChatSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetParent !== null) {
          try {
            el.click();
            await new Promise((r) => setTimeout(r, 800));
            return;
          } catch(e) {}
        }
      }
    }

    // Dọn dẹp thủ công input và attachment nếu không bấm được nút
    const allRemoveBtns = document.querySelectorAll(
      'button[aria-label*="Xóa"], button[aria-label*="Remove"], button[aria-label*="Delete"], button[aria-label*="close"], .remove-button, [data-test-id*="remove-attachment"], mat-chip button, .uploader-preview button'
    );
    allRemoveBtns.forEach((btn) => {
      try { btn.click(); } catch(e) {}
    });

    const input = document.querySelector('rich-textarea div[contenteditable="true"], div[contenteditable="true"]');
    if (input) {
      input.innerHTML = '';
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
