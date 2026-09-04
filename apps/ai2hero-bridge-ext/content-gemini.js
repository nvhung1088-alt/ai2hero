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

  // Selectors nhận diện nút Stop (đang sinh text/image)
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
      'mat-progress-spinner, .image-placeholder, .sparkle-container, [aria-busy="true"], .loading-spinner, .generating-image, image-loading-indicator, [data-test-id*="loading"], img[src*="spinner"], img[src*="loading"]'
    );
    for (const el of loadingEls) {
      if (el.offsetParent !== null) return true;
    }
    return false;
  };

  /**
   * Thao tác gửi prompt và nhận kết quả từ Gemini Web
   */
  async function processGeminiJob(promptText, attachments, autoNewChat = true) {
    // 0. Làm mới phiên chat (New Chat) để xóa sạch ảnh cũ và tránh nhầm lẫn
    if (autoNewChat !== false) {
      try {
        await triggerNewChat();
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.warn('[Ai2Hero Bridge] Lỗi New Chat:', e);
      }
    }

    // 1. Kiểm tra xem Gemini có đang gặp lỗi popup / đăng nhập không
    checkGeminiErrorBanners();

    // 2. Dò tìm ô nhập liệu trên Gemini Web
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

    // 3. Xóa TẤT CẢ các file đính kèm / preview chips cũ còn nằm trong khung nhập trước khi xử lý
    const allRemoveBtns = document.querySelectorAll(
      'button[aria-label*="Xóa"], button[aria-label*="Remove"], button[aria-label*="Delete"], button[aria-label*="close"], .remove-button, [data-test-id*="remove-attachment"], mat-chip button, .uploader-preview button, button[aria-label*="Hủy"], button[aria-label*="Clear"]'
    );
    allRemoveBtns.forEach((btn) => {
      try { btn.click(); } catch(e) {}
    });
    await new Promise((r) => setTimeout(r, 200));

    // 4. Nếu có file đính kèm (Ảnh): DÁN ẢNH TRƯỚC
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log(`[Ai2Hero Bridge] Đang dán ${attachments.length} file đính kèm trước...`);

      for (const attachItem of attachments) {
        let base64Data = null;
        if (typeof attachItem === 'string') {
          base64Data = attachItem;
        } else if (attachItem && attachItem.data) {
          base64Data = attachItem.data;
        } else if (attachItem && attachItem.base64) {
          base64Data = attachItem.base64;
        } else if (attachItem && attachItem.url) {
          base64Data = attachItem.url;
        }

        if (base64Data && base64Data.startsWith('data:')) {
          try {
            console.log('[Ai2Hero Bridge] Đang chuyển đổi Base64 sang File để dán vào Gemini...');
            const res = await fetch(base64Data);
            const blob = await res.blob();
            const ext = blob.type.split('/')[1] || 'jpeg';
            const file = new File([blob], `input_image_${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' });

            const dt = new DataTransfer();
            dt.items.add(file);

            inputEl.focus();

            // Kích hoạt Paste Event trên inputEl, document và window
            const pasteEvent = new ClipboardEvent('paste', {
              clipboardData: dt,
              bubbles: true,
              cancelable: true,
              composed: true
            });
            inputEl.dispatchEvent(pasteEvent);
            document.dispatchEvent(pasteEvent);

            // Thử kích hoạt qua input[type="file"] nếu có
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach((fi) => {
              try {
                fi.files = dt.files;
                fi.dispatchEvent(new Event('change', { bubbles: true }));
                fi.dispatchEvent(new Event('input', { bubbles: true }));
              } catch(e) {}
            });

            console.log('[Ai2Hero Bridge] ✅ Đã dán ảnh vào khung chat. Bắt đầu cảm biến theo dõi tiến trình upload của Gemini...');

            // CẢM BIẾN CHỜ ẢNH UPLOAD XONG 100% (Spinner vòng xoay biến mất hoàn toàn)
            const isAttachmentUploading = () => {
              const spinners = document.querySelectorAll(
                'rich-textarea mat-progress-spinner, .input-area mat-progress-spinner, .uploader-preview mat-progress-spinner, [role="progressbar"], .attachment-preview mat-progress-spinner, mat-chip mat-progress-spinner, .uploader-preview .loading, .uploader-preview svg circle, .uploader-preview mat-spinner, .uploader-preview [class*="spinner"], .uploader-preview [class*="loading"], rich-textarea [class*="spinner"], rich-textarea [class*="loading"], [data-test-id*="spinner"], [data-test-id*="loading"]'
              );
              for (const s of spinners) {
                if (s.offsetParent !== null) return true;
              }
              return false;
            };

            // 1. Chờ tối thiểu 1.5s để Google render chip preview và kích hoạt vòng xoay loading
            await new Promise((r) => setTimeout(r, 1500));

            // 2. Chờ cho đến khi vòng xoay biến mất hoàn toàn (tối đa 35 giây)
            const uploadStart = Date.now();
            const maxUploadWaitMs = 35000;
            let uploadCompleted = false;

            while (Date.now() - uploadStart < maxUploadWaitMs) {
              if (!isAttachmentUploading()) {
                // Kiểm tra xem chip ảnh đã render xong chưa
                const previewImgs = document.querySelectorAll('rich-textarea img, .uploader-preview img, mat-chip img, .attachment-preview img, .chat-input-container img');
                let foundComplete = false;
                for (const img of previewImgs) {
                  if (img.offsetParent !== null && img.complete) {
                    foundComplete = true;
                    break;
                  }
                }
                if (foundComplete || previewImgs.length > 0) {
                  console.log('[Ai2Hero Bridge] 🎯 Ảnh đã upload lên máy chủ Google xong 100%! Vòng xoay đã biến mất.');
                  uploadCompleted = true;
                  break;
                }
              }
              await new Promise((r) => setTimeout(r, 600));
            }

            if (!uploadCompleted) {
              console.warn('[Ai2Hero Bridge] Hết thời gian chờ spinner, tiếp tục thử gửi...');
            }

            // Chờ ổn định DOM 800ms
            await new Promise((r) => setTimeout(r, 800));
          } catch (e) {
            console.warn('[Ai2Hero Bridge] Lỗi dán file đính kèm:', e);
          }
        }
      }
    }

    // 5. Điền nội dung Prompt chuẩn cho Google Lit / Contenteditable
    inputEl.focus();
    if (inputEl.tagName.toLowerCase() === 'textarea') {
      inputEl.value = promptText;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Contenteditable DIV (Gemini Quill / Lit component)
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
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    await new Promise((r) => setTimeout(r, 800));

    // 6. Tìm và bấm nút Gửi (Kèm cơ chế Thử Lại - Retry nếu Gemini chưa nhận lệnh)
    const sendButtonSelectors = [
      'button[aria-label*="Gửi"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="Submit"]',
      'button.send-button',
      '[data-test-id="send-button"]',
      'button:has(mat-icon[fonticon*="send"])',
      'button:has(mat-icon[fonticon*="arrow"])',
      'button:has(svg)',
      '.send-button-container button',
      'rich-textarea + * button',
      '.input-area button:last-of-type'
    ];

    const getActiveSendButton = () => {
      for (const selector of sendButtonSelectors) {
        try {
          const els = document.querySelectorAll(selector);
          for (const el of els) {
            const btn = el.tagName && el.tagName.toLowerCase() === 'button' ? el : (el.closest('button') || el);
            if (btn && btn.offsetParent !== null && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
              const label = (btn.getAttribute('aria-label') || '').toLowerCase();
              if (!label.includes('mic') && !label.includes('thêm') && !label.includes('add') && !label.includes('menu')) {
                return btn;
              }
            }
          }
        } catch (e) {}
      }

      // Quét fallback tất cả button trong khung chat
      const inputArea = document.querySelector('rich-textarea, .input-area, .chat-input-container, chat-window') || document.body;
      const allButtons = Array.from(inputArea.querySelectorAll('button'));
      for (let i = allButtons.length - 1; i >= 0; i--) {
        const btn = allButtons[i];
        if (btn.offsetParent !== null && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') {
          const label = (btn.getAttribute('aria-label') || '').toLowerCase();
          if (!label.includes('mic') && !label.includes('thêm') && !label.includes('add') && !label.includes('menu')) {
            return btn;
          }
        }
      }
      return null;
    };

    // Thử bấm nút gửi tối đa 4 lần nếu nội dung vẫn nằm kẹt trong ô nhập
    for (let sendAttempt = 1; sendAttempt <= 4; sendAttempt++) {
      const sendBtn = getActiveSendButton();
      if (sendBtn) {
        console.log(`[Ai2Hero Bridge] Đang bấm nút Gửi trên Gemini Web (Lần ${sendAttempt})...`);
        try { sendBtn.focus(); } catch (e) {}
        sendBtn.click();
        sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
        sendBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
        sendBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true }));
      }

      // Luôn kích hoạt thêm sự kiện Enter
      const enterDown = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true
      });
      inputEl.dispatchEvent(enterDown);

      await new Promise((r) => setTimeout(r, 1200));

      // Kiểm tra xem đã gửi thành công chưa (nút Dừng xuất hiện hoặc ô nhập đã sạch)
      const currentInputText = (inputEl.innerText || inputEl.value || '').trim();
      if (isStopButtonVisible() || isGeneratingImage() || currentInputText.length === 0) {
        console.log('[Ai2Hero Bridge] 🚀 ĐÃ GỬI LỆNH THÀNH CÔNG VÀO GEMINI!');
        break;
      } else {
        console.warn(`[Ai2Hero Bridge] Ô nhập vẫn còn text sau lần bấm ${sendAttempt}, đang thử lại...`);
      }
    }

    // 7. Chờ đợi chu kỳ sinh phản hồi của Gemini
    const isImageJob = (attachments && Array.isArray(attachments) && attachments.length > 0) || promptText.includes('ảnh bìa') || promptText.includes('thumbnail') || promptText.includes('Tạo hình ảnh');
    const result = await waitForGeminiResponseLifecycle(isImageJob);

    // 8. Tự động bảo trì giải phóng RAM/DOM định kỳ sau mỗi 20 tác vụ trên tab Gemini Pro
    window.__ai2heroGeminiJobCount = (window.__ai2heroGeminiJobCount || 0) + 1;
    if (window.__ai2heroGeminiJobCount >= 20) {
      console.log('[Ai2Hero Bridge] 🔄 Đã xử lý 20 tác vụ liên tiếp trên tab Gemini Pro. Lên lịch F5 tự động sau 2s...');
      setTimeout(() => {
        window.__ai2heroGeminiJobCount = 0;
        window.location.reload();
      }, 2000);
    }

    return {
      success: true,
      result: result
    };
  }

  /**
   * Theo dõi toàn bộ chu kỳ sinh phản hồi của Gemini từ lúc Bắt đầu -> Đang tạo -> Hoàn tất 100%
   */
  function waitForGeminiResponseLifecycle(isImageJob = false) {
    return new Promise((resolve, reject) => {
      const MAX_TIMEOUT_MS = isImageJob ? 180000 : 120000;
      const startTime = Date.now();

      // Ghi nhận số lượng và nội dung tin nhắn trước khi AI sinh câu mới (chống bắt nhầm tin nhắn cũ)
      const initialResponses = document.querySelectorAll(
        'model-response, [data-test-id="model-response"], .model-response, message-content, [role="article"], .response-container'
      );
      const initialResponseCount = initialResponses.length;
      const initialResponseText = initialResponseCount > 0 
        ? (initialResponses[initialResponseCount - 1].innerText || initialResponses[initialResponseCount - 1].textContent || '').trim() 
        : '';

      let hasStartedGenerating = false;
      let lastTextSnapshot = '';
      let stableTextCount = 0;
      let finishDebounceTimer = null;
      let lastExtractedText = '';

      // Cảm biến phát hiện lỗi Fatal Error của Google Gemini Pro (1095 / Mất kết nối / Stream Aborted)
      // CHUẨN XÁC 100%: Chỉ quét thẻ model-response mới sinh ra, KHÔNG quét toàn bộ trang web (tránh false positive)
      const isGeminiFatalError = (elapsedMs) => {
        // Chỉ bắt đầu kiểm tra sau ít nhất 2.5s kể từ khi gửi prompt (tránh bắt nhầm trạng thái ban đầu)
        if (!elapsedMs || elapsedMs < 2500) {
          return null;
        }

        // Đối với tác vụ tạo ảnh: Nếu đang có hiệu ứng loading/spinner thì tuyệt đối không coi là lỗi
        if (isImageJob && isGeneratingImage()) {
          return null;
        }

        const errorKeywords = [
          '1095',
          'đã xảy ra lỗi (1095)',
          'mất kết nối internet',
          'không có kết nối internet'
        ];

        const quotaKeywords = [
          'giới hạn của bạn',
          'giới hạn được đặt lại',
          'tạo thêm hình ảnh ngay khi',
          'mức sử dụng của bạn',
          'đạt đến giới hạn',
          'limit reached',
          'quota exceeded',
          'rate limit'
        ];

        // Hàm trích xuất mốc giờ đặt lại hạn mức từ giao diện (Ví dụ: "17:03")
        const extractResetTime = () => {
          try {
            const bodyTxt = document.body.innerText || '';
            const m = bodyTxt.match(/[Đđ]ặt lại lúc\s*(\d{1,2}:\d{2})/i) || 
                      bodyTxt.match(/reset at\s*(\d{1,2}:\d{2})/i) || 
                      bodyTxt.match(/[Đđ]ặt lại vào.*?lúc\s*(\d{1,2}:\d{2})/i);
            if (m) return m[1].trim();
          } catch(e) {}
          return '';
        };

        // 1. Quét thẻ model-response mới nhất được sinh ra trong lượt chat này
        const currentResponses = document.querySelectorAll(
          'model-response, [data-test-id="model-response"], .model-response, message-content, [role="article"], .response-container'
        );
        if (currentResponses.length > initialResponseCount) {
          const latest = currentResponses[currentResponses.length - 1];
          const latestText = (latest.innerText || latest.textContent || '').toLowerCase();
          
          // Kiểm tra lỗi Hạn mức tạo ảnh (Quota Limit) trước tiên
          for (const qk of quotaKeywords) {
            if (latestText.includes(qk)) {
              const resetTimeStr = extractResetTime();
              return `QUOTA_EXCEEDED:${resetTimeStr}`;
            }
          }

          if (latest.hasAttribute('data-status') && latest.getAttribute('data-status') === 'error') {
            return 'Gemini model-response data-status error';
          }
          if (latest.classList.contains('error') || latest.classList.contains('response-error')) {
            return 'Gemini response-error';
          }
          for (const kw of errorKeywords) {
            if (latestText.includes(kw)) {
              return `Phát hiện lỗi trong câu trả lời mới: ${kw}`;
            }
          }
        }

        // 2. Quét dialog / snackbar lỗi hiển thị trực tiếp (Chỉ các thông báo lỗi stream đỏ xuất hiện sau khi gửi)
        const toastErrors = document.querySelectorAll('.mat-mdc-snack-bar-container, .toast-error, [data-test-id="error-banner"]');
        for (const t of toastErrors) {
          if (t.offsetParent !== null) {
            const txt = (t.innerText || '').toLowerCase();
            for (const qk of quotaKeywords) {
              if (txt.includes(qk)) {
                const resetTimeStr = extractResetTime();
                return `QUOTA_EXCEEDED:${resetTimeStr}`;
              }
            }
            if (errorKeywords.some(kw => txt.includes(kw))) {
              return txt;
            }
          }
        }

        return null;
      };

      // Lấy phần tử model-response cuối cùng (Chỉ câu trả lời của AI)
      const getLatestModelResponseElement = () => {
        const modelResponses = document.querySelectorAll(
          'model-response, [data-test-id="model-response"], .model-response, message-content, [role="article"], .response-container'
        );
        if (modelResponses.length > 0) {
          return modelResponses[modelResponses.length - 1];
        }
        return null;
      };

      // Tải trực tiếp ảnh do Gemini sinh ra về máy (Không đụng chạm vào menu sidebar)
      async function downloadGeneratedImageDirectly(imgEl, filename = 'thumbnail.jpg') {
        if (!imgEl) return false;
        try {
          // Cách 1: Fetch blob từ URL và tải trực tiếp
          const src = imgEl.src || imgEl.getAttribute('src') || '';
          if (src.startsWith('http') || src.startsWith('blob:')) {
            const res = await fetch(src);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            console.log('[Ai2Hero Bridge] 🎯 Đã kích hoạt tải ảnh trực tiếp qua thẻ Download!');
            return true;
          }
        } catch (e) {
          console.warn('[Ai2Hero Bridge] Lỗi tải qua Blob:', e);
        }

        // Cách 2: Vẽ Canvas và kích hoạt tải về
        try {
          const canvas = document.createElement('canvas');
          canvas.width = imgEl.naturalWidth || imgEl.width || 1024;
          canvas.height = imgEl.naturalHeight || imgEl.height || 1024;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          console.log('[Ai2Hero Bridge] 🎯 Đã kích hoạt tải ảnh trực tiếp qua Canvas DataURL!');
          return true;
        } catch (canvasErr) {
          console.warn('[Ai2Hero Bridge] Lỗi tải qua Canvas:', canvasErr);
        }

        return false;
      }

      // Tìm kiếm phần tử ảnh THỰC SỰ do Gemini Imagen 3 tạo ra (Chỉ trong vùng Chat chính / Model Response)
      const findCompletedGeneratedImage = () => {
        const isRealPhoto = (img) => {
          if (!img) return false;
          const src = img.src || img.getAttribute('src') || '';
          if (!src) return false;

          // Loại trừ 100% các file SVG, icon giao diện Google
          if (
            src.includes('.svg') ||
            src.includes('image/svg') ||
            src.startsWith('data:image/svg') ||
            src.includes('gstatic.com') ||
            src.includes('/icons/') ||
            src.includes('/avatar') ||
            src.includes('googleusercontent.com/a/') ||
            src.includes('favicon')
          ) {
            return false;
          }

          // Bỏ qua ảnh nằm trong khung chat của user
          if (
            img.closest('user-query') ||
            img.closest('user-prompt') ||
            img.closest('.uploader-preview') ||
            img.closest('.attachment-preview') ||
            img.closest('rich-textarea') ||
            img.closest('.input-area') ||
            img.closest('mat-sidenav') ||
            img.closest('.sidebar') ||
            img.closest('nav')
          ) {
            return false;
          }

          // Kiểm tra kích thước ảnh (Ảnh bìa thật của Gemini luôn >= 150px)
          const w = img.naturalWidth || img.width || img.offsetWidth || 0;
          const h = img.naturalHeight || img.height || img.offsetHeight || 0;
          if (w > 0 && h > 0 && (w < 150 || h < 150)) {
            return false;
          }

          return true;
        };

        // Ưu tiên 1: Tìm trực tiếp trong thẻ model-response mới nhất
        const latestResponse = getLatestModelResponseElement();
        if (latestResponse) {
          const responseImgs = Array.from(latestResponse.querySelectorAll('img, picture img, image-viewer img, generated-image img'));
          for (let i = responseImgs.length - 1; i >= 0; i--) {
            const img = responseImgs[i];
            if (isRealPhoto(img)) {
              console.log('[Ai2Hero Bridge] ✅ Đã tìm thấy ảnh thật do Gemini tạo ra trong model-response:', (img.src || '').slice(0, 80));
              return img;
            }
          }
        }

        // Ưu tiên 2: Quét toàn bộ vùng Chat chính (Main Container)
        const mainChat = document.querySelector('main, chat-window, .conversation-container, [role="main"]') || document.body;
        const allImgs = Array.from(mainChat.querySelectorAll('img, picture img, image-viewer img, generated-image img'));

        for (let i = allImgs.length - 1; i >= 0; i--) {
          const img = allImgs[i];
          if (isRealPhoto(img)) {
            console.log('[Ai2Hero Bridge] ✅ Đã tìm thấy ảnh thật do Gemini tạo ra trong vùng Chat chính:', (img.src || '').slice(0, 80));
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

        let raw = (clone.innerText || clone.textContent || '').trim();
        // Loại bỏ codeblock copy header nếu có ("json\nCopy\n")
        raw = raw.replace(/^json\s*\n\s*copy\s*\n/i, '').trim();
        return raw;
      };

      // Chuyển đổi ảnh sang Base64 an toàn (Tự động nâng cấp URL Google CDN lên Full HD 1280p)
      async function convertImgToBase64Safe(imgEl) {
        if (!imgEl) return '';
        let src = imgEl.src || imgEl.getAttribute('src') || '';
        if (!src) return '';
        if (src.startsWith('data:image/')) return src;

        // Nếu là ảnh Google CDN, nâng độ phân giải lên Full HD
        if (src.includes('googleusercontent.com')) {
          src = src.replace(/=w\d+-h\d+.*$/, '=s1280').replace(/=s\d+.*$/, '=s1280');
        }

        // Cách 1: Fetch blob thông thường từ ngữ cảnh tab
        try {
          const res = await fetch(src);
          const blob = await res.blob();
          if (blob && blob.size > 2000) {
            const b64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(blob);
            });
            if (b64 && b64.length > 2000) {
              console.log(`[Ai2Hero Bridge] ✅ Fetch blob Base64 (${blob.size} bytes) thành công!`);
              return b64;
            }
          }
        } catch (e) {
          // Bỏ qua
        }

        // Cách 2: Vẽ trực tiếp lên HTML5 canvas
        try {
          const canvas = document.createElement('canvas');
          const w = imgEl.naturalWidth || imgEl.width || 1024;
          const h = imgEl.naturalHeight || imgEl.height || 1024;
          if (w >= 100 && h >= 100) {
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgEl, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            if (dataUrl && dataUrl.length > 2000) {
              console.log(`[Ai2Hero Bridge] ✅ Trích xuất ảnh Base64 từ Canvas thành công!`);
              return dataUrl;
            }
          }
        } catch (canvasErr) {
          // Bỏ qua
        }

        // Cách 3: Ủy quyền cho Background Service Worker (toàn quyền host_permissions với timeout 2s)
        if (src.startsWith('http')) {
          try {
            const bgPromise = new Promise((resolve) => {
              chrome.runtime.sendMessage(
                { action: 'CONVERT_IMAGE_BASE64', url: src },
                (response) => resolve(response)
              );
            });
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
            const bgRes = await Promise.race([bgPromise, timeoutPromise]);
            if (bgRes && bgRes.success && bgRes.base64 && bgRes.base64.length > 2000) {
              console.log('[Ai2Hero Bridge] ✅ Background đã chuyển đổi ảnh sang Base64 thành công!');
              return bgRes.base64;
            }
          } catch (bgErr) {
            // Bỏ qua
          }
        }

        return src;
      }

      let hasDownloadedImage = false;

      async function buildFinalResult() {
        const text = extractCleanResponse();
        let finalImgMarkdown = '';
        const genImg = findCompletedGeneratedImage();
        if (genImg && genImg.src) {
          console.log('[Ai2Hero Bridge] Đang xử lý ảnh bìa Gemini tạo ra:', genImg.src.slice(0, 80));
          
          // Kích hoạt Chrome Native Downloads DUY NHẤT 1 LẦN qua Background Service Worker
          if (!hasDownloadedImage) {
            hasDownloadedImage = true;
            try {
              chrome.runtime.sendMessage({
                action: 'DOWNLOAD_IMAGE_FILE',
                url: genImg.src,
                filename: `Ai2Hero_Thumbnail_${Date.now()}.jpg`
              });
              console.log('[Ai2Hero Bridge] 🎯 Đã kích hoạt tải 1 ảnh bìa duy nhất về máy tính!');
            } catch (e) {}
          }

          // Chuyển đổi sang Base64 bắn trực tiếp về WebSocket Python
          let b64Url = '';
          try {
            b64Url = await convertImgToBase64Safe(genImg);
          } catch (e) {
            console.warn('[Ai2Hero Bridge] convertImgToBase64Safe error:', e);
          }
          const finalSrc = (b64Url && b64Url.length > 2000) ? b64Url : genImg.src;
          finalImgMarkdown += `\n![Image](${finalSrc})\n`;
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
        const elapsed = Date.now() - startTime;

        // BƯỚC 0: CẢM BIẾN BẮT LỖI TỨC THÌ (CHO GEMINI PRO 1095 / MẤT KẾT NỐI / QUOTA)
        const fatalErr = isGeminiFatalError(elapsed);
        if (fatalErr) {
          if (fatalErr.startsWith('QUOTA_EXCEEDED')) {
            console.error('[Ai2Hero Bridge] 🛑 PHÁT HIỆN HẾT HẠN MỨC (QUOTA EXCEEDED):', fatalErr);
            if (observer) observer.disconnect();
            clearInterval(intervalCheck);
            clearTimeout(globalTimeout);
            reject(new Error(fatalErr));
            return;
          }

          console.error('[Ai2Hero Bridge] 🚨 PHÁT HIỆN LỖI GEMINI PRO (1095 / MẤT KẾT NỐI):', fatalErr);
          if (observer) observer.disconnect();
          clearInterval(intervalCheck);
          clearTimeout(globalTimeout);

          // Tự động kích hoạt F5 Hard Reload tab sau 800ms để giải phóng sạch kết nối gRPC
          setTimeout(() => {
            console.log('[Ai2Hero Bridge] 🔄 Đang tự động F5 tab để phục hồi kết nối Gemini Pro...');
            window.location.reload();
          }, 800);

          reject(new Error(`GEMINI_ERROR_1095: ${fatalErr}`));
          return;
        }

        const isGenerating = isStopButtonVisible() || (isImageJob && isGeneratingImage());
        const currentText = extractCleanResponse();
        const foundImage = findCompletedGeneratedImage();
        const currentResponses = document.querySelectorAll(
          'model-response, [data-test-id="model-response"], .model-response, message-content, [role="article"], .response-container'
        );
        const currentResponseCount = currentResponses.length;

        // Phát hiện khi Gemini thực sự bắt đầu sinh phản hồi mới
        if (
          isGenerating || 
          currentResponseCount > initialResponseCount || 
          (currentText && currentText.length > 5 && currentText !== initialResponseText)
        ) {
          if (!hasStartedGenerating) {
            hasStartedGenerating = true;
            console.log('[Ai2Hero Bridge] ⚡ Phát hiện Gemini đã bắt đầu tạo phản hồi mới!');
          }
        }

        if (isImageJob) {
          // ĐỐI VỚI TÁC VỤ ẢNH: Nếu đã tìm thấy ảnh kết quả do Gemini vẽ ra -> XỬ LÝ NGAY LẬP TỨC
          if (foundImage) {
            console.log('[Ai2Hero Bridge] 🎯 ĐÃ PHÁT HIỆN ẢNH GEMINI VẼ XONG! Đang gửi kết quả về Python...');
            if (!finishDebounceTimer) {
              finishDebounceTimer = setTimeout(async () => {
                const resultText = await buildFinalResult();
                if (resultText && resultText.trim().length > 0) {
                  if (observer) observer.disconnect();
                  clearInterval(intervalCheck);
                  clearTimeout(globalTimeout);

                  console.log('[Ai2Hero Bridge] ✅ GỬI KẾT QUẢ ẢNH BÌA VỀ PYTHON THÀNH CÔNG!');
                  resolve(resultText);
                }
              }, 800);
            }
          } else if (isGenerating) {
            hasStartedGenerating = true;
            if (finishDebounceTimer) {
              clearTimeout(finishDebounceTimer);
              finishDebounceTimer = null;
            }
          } else if (hasStartedGenerating || currentText.length > 10) {
            if (!finishDebounceTimer) {
              finishDebounceTimer = setTimeout(async () => {
                const resultText = await buildFinalResult();
                if (resultText && resultText.trim().length > 0) {
                  if (observer) observer.disconnect();
                  clearInterval(intervalCheck);
                  clearTimeout(globalTimeout);
                  resolve(resultText);
                }
              }, 1500);
            }
          }
        } else {
          // ĐỐI VỚI TÁC VỤ TEXT
          const elapsed = Date.now() - startTime;
          if (isGenerating) {
            hasStartedGenerating = true;
            stableTextCount = 0;
            if (finishDebounceTimer) {
              clearTimeout(finishDebounceTimer);
              finishDebounceTimer = null;
            }
          }

          // Theo dõi độ ổn định của text CHỈ KHI đã bắt đầu sinh và nội dung khác tin nhắn cũ
          if (hasStartedGenerating && currentText && currentText !== initialResponseText && currentText.length > 5) {
            if (currentText === lastTextSnapshot) {
              stableTextCount++;
            } else {
              lastTextSnapshot = currentText;
              stableTextCount = 0;
            }
          }

          // Điều kiện hoàn thành nghiêm ngặt (Strict Gate):
          // 1. BẮT BUỘC ĐÃ BẮT ĐẦU SINH THỰC SỰ (hasStartedGenerating === true)
          // 2. Không còn nút Stop / Loading (!isGenerating)
          // 3. Text khác tin nhắn cũ và có độ dài hợp lệ (> 10 ký tự)
          // 4. Text đã ổn định ít nhất 3 chu kỳ liên tiếp (>= 1000ms không còn đổi)
          // 5. Đã trôi qua ít nhất 2.5s kể từ khi gửi prompt
          const isTextComplete = (
            hasStartedGenerating &&
            !isGenerating &&
            currentText.length > 10 &&
            currentText !== initialResponseText &&
            stableTextCount >= 3 &&
            elapsed >= 2500
          );

          if (isTextComplete) {
            if (!finishDebounceTimer) {
              finishDebounceTimer = setTimeout(async () => {
                const resultText = await buildFinalResult();
                if (resultText && resultText.trim().length > 0) {
                  if (observer) observer.disconnect();
                  clearInterval(intervalCheck);
                  clearTimeout(globalTimeout);

                  console.log('[Ai2Hero Bridge] ✅ Gemini đã sinh text xong hoàn tất 100% (Length: ' + resultText.length + ')!');
                  resolve(resultText);
                }
              }, 600);
            }
          }
        }
      }, 350);

      // MutationObserver theo dõi thay đổi DOM
      const observer = new MutationObserver(() => {
        const text = extractCleanResponse();
        if (text && text !== lastExtractedText && text !== initialResponseText) {
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
