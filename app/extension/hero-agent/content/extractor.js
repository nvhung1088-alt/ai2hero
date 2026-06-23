// Hero Agent Content Script — extractor.js
// Bóc tách nội dung DOM và chuyển đổi sang Markdown sạch

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    try {
      const data = extractPageData();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
  return true;
});

function extractPageData() {
  const title = document.title || document.querySelector('h1')?.innerText || 'Untitled Page';
  const url = window.location.href;
  
  // Thu thập metadata
  const metadata = {
    url,
    domain: window.location.hostname,
    scrapedAt: new Date().toISOString(),
    description: getMetaContent('description') || getMetaContent('og:description') || '',
    author: getMetaContent('author') || getMetaContent('article:author') || '',
    publishedDate: getMetaContent('article:published_time') || getMetaContent('pubdate') || '',
    ogImage: getMetaContent('og:image') || ''
  };

  // Tìm node nội dung chính (article, main, hoặc fallback body)
  const rootNode = document.querySelector('article') || document.querySelector('main') || document.body;
  
  // Ghi nhận kích thước thô ban đầu
  const rawLength = document.documentElement.outerHTML.length;

  // Trích xuất sang Markdown sạch
  let markdown = domToMarkdown(rootNode, 0);
  
  // Dọn dẹp newline dư thừa
  markdown = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title,
    content: markdown,
    metadata,
    rawLength,
    cleanLength: markdown.length
  };
}

// Lấy nội dung từ meta tag
function getMetaContent(name) {
  const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return element ? element.getAttribute('content') : null;
}

// Đệ quy chuyển đổi DOM sang Markdown
function domToMarkdown(node, depth = 0) {
  // Chống loop vô tận hoặc quá sâu
  if (depth > 100) return '';
  if (!node) return '';

  // Text Node
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim().replace(/\s+/g, ' ');
    return text ? `${text} ` : '';
  }

  // Khác Element Node -> Bỏ qua
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tagName = node.tagName.toUpperCase();

  // Các thẻ rác cần loại bỏ hoàn toàn
  const ignoreTags = [
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'NAV', 'FOOTER', 
    'HEADER', 'INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'FORM',
    'SVG', 'CANVAS', 'AUDIO', 'VIDEO'
  ];
  if (ignoreTags.includes(tagName)) return '';

  // Bỏ qua các class/id rác thông dụng (ads, comment boxes, popups, sidebars)
  const className = (node.className || '').toString().toLowerCase();
  const idName = (node.id || '').toString().toLowerCase();
  const garbageKeywords = ['ads', 'comment-box', 'sidebar', 'widget', 'cookie-banner', 'popup', 'menu-container'];
  
  if (garbageKeywords.some(keyword => className.includes(keyword) || idName.includes(keyword))) {
    return '';
  }

  // Duyệt qua các con của node hiện tại
  let childContent = '';
  for (let i = 0; i < node.childNodes.length; i++) {
    childContent += domToMarkdown(node.childNodes[i], depth + 1);
  }

  childContent = childContent.trim();
  if (!childContent) return '';

  // Format sang Markdown dựa trên thẻ HTML
  switch (tagName) {
    case 'H1':
      return `\n\n# ${childContent}\n\n`;
    case 'H2':
      return `\n\n## ${childContent}\n\n`;
    case 'H3':
      return `\n\n### ${childContent}\n\n`;
    case 'H4':
      return `\n\n#### ${childContent}\n\n`;
    case 'P':
      return `\n\n${childContent}\n\n`;
    case 'LI':
      return `\n- ${childContent}`;
    case 'UL':
    case 'OL':
      return `\n${childContent}\n`;
    case 'A': {
      const href = node.getAttribute('href');
      // Chỉ giữ các link ngoài hợp lệ
      if (href && href.startsWith('http') && !href.includes(window.location.hostname)) {
        return ` [${childContent}](${href}) `;
      }
      return ` ${childContent} `;
    }
    case 'IMG': {
      const src = node.getAttribute('src');
      const alt = node.getAttribute('alt') || 'ảnh';
      if (src && src.startsWith('http')) {
        return `\n![${alt}](${src})\n`;
      }
      return '';
    }
    case 'DIV':
    case 'SECTION':
    case 'ARTICLE':
    case 'MAIN':
      return `\n${childContent}\n`;
    default:
      return ` ${childContent} `;
  }
}
