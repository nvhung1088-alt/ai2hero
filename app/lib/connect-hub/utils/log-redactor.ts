/**
 * LOG REDACTOR — Tiện ích che giấu thông tin cá nhân nhạy cảm (PII) 
 * trước khi ghi nhận nhật ký (logs) vào cơ sở dữ liệu.
 */

export function redactResponsePreview(data: any, maxLength = 500): string {
  if (data === null || data === undefined) return '';

  let obj: any;
  if (typeof data === 'string') {
    try {
      obj = JSON.parse(data);
    } catch {
      // Nếu là chuỗi text thuần không phải JSON, chạy regex che thô
      return redactText(data).substring(0, maxLength);
    }
  } else {
    // Clone object sâu để tránh làm thay đổi data gốc đang chạy ở engine
    try {
      obj = JSON.parse(JSON.stringify(data));
    } catch {
      obj = data;
    }
  }

  // Đệ quy xử lý các thuộc tính nhạy cảm
  const redactObject = (item: any): any => {
    if (item === null || item === undefined) return item;

    if (Array.isArray(item)) {
      return item.map(redactObject);
    }

    if (typeof item === 'object') {
      const redacted: Record<string, any> = {};
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          const lowerKey = key.toLowerCase();
          const val = item[key];

          if (typeof val === 'string') {
            if (
              lowerKey.includes('phone') || 
              lowerKey.includes('mobile') || 
              lowerKey.includes('sdt') || 
              lowerKey.includes('dienthoai') ||
              lowerKey.includes('telephone')
            ) {
              redacted[key] = redactPhone(val);
            } else if (lowerKey.includes('email')) {
              redacted[key] = redactEmail(val);
            } else if (lowerKey.includes('address') || lowerKey.includes('diachi')) {
              redacted[key] = '[REDACTED_ADDRESS]';
            } else if (
              lowerKey.includes('key') || 
              lowerKey.includes('token') || 
              lowerKey.includes('secret') || 
              lowerKey.includes('password') || 
              lowerKey.includes('auth') ||
              lowerKey.includes('credential')
            ) {
              redacted[key] = '[REDACTED_CREDENTIAL]';
            } else {
              redacted[key] = val;
            }
          } else if (typeof val === 'object') {
            redacted[key] = redactObject(val);
          } else {
            redacted[key] = val;
          }
        }
      }
      return redacted;
    }

    return item;
  };

  const processed = redactObject(obj);
  let result = typeof processed === 'string' ? processed : JSON.stringify(processed);

  if (result.length > maxLength) {
    result = result.substring(0, maxLength) + '... (truncated)';
  }

  return result;
}

function redactPhone(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.length < 6) return '****';
  // Giữ 3 số đầu và 3 số cuối (ví dụ: 098***4321)
  return trimmed.substring(0, 3) + '****' + trimmed.substring(trimmed.length - 3);
}

function redactEmail(email: string): string {
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 0) return 'e***@***.***';
  const name = trimmed.substring(0, atIdx);
  const domain = trimmed.substring(atIdx);
  if (name.length <= 1) return name + '***' + domain;
  return name.substring(0, 1) + '***' + domain;
}

function redactText(text: string): string {
  let result = text;
  // Che email trong text
  result = result.replace(/([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g, (match, name, domain, ext) => {
    return name.substring(0, 1) + '***@' + domain + '.' + ext;
  });
  // Che SĐT trong text (chuỗi 9-11 số bắt đầu bằng 0)
  result = result.replace(/(0[1-9][0-9]{7,9})/g, (match) => {
    return match.substring(0, 3) + '****' + match.substring(match.length - 3);
  });
  return result;
}
