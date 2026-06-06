// Runner an toàn — không có eval()/Function()
// Nhận vào input đã được interpolate từ flow-engine
export async function runCoreLogic(
  actionSlug: string,
  input: Record<string, any>
): Promise<{ success: boolean; data?: any; error?: string }> {

  switch (actionSlug) {
    case 'filter_condition': {
      const { field, operator, value } = input;
      const fieldVal = String(field ?? '');
      const checkVal = String(value ?? '');
      let passed = false;
      
      switch (operator) {
        case 'eq':           passed = fieldVal === checkVal; break;
        case 'ne':           passed = fieldVal !== checkVal; break;
        case 'contains':     passed = fieldVal.includes(checkVal); break;
        case 'not_contains': passed = !fieldVal.includes(checkVal); break;
        case 'gt':           passed = Number(fieldVal) > Number(checkVal); break;
        case 'lt':           passed = Number(fieldVal) < Number(checkVal); break;
        case 'gte':          passed = Number(fieldVal) >= Number(checkVal); break;
        case 'lte':          passed = Number(fieldVal) <= Number(checkVal); break;
        default:             passed = false;
      }
      
      if (!passed) {
        // Trả về error để flow-engine áp dụng fail-fast
        return { success: false, error: `Điều kiện không thỏa mãn: "${fieldVal}" ${operator} "${checkVal}"` };
      }
      return { success: true, data: { passed: true } };
    }

    case 'delay': {
      // Giới hạn max 25s để không vượt quá giới hạn timeout của Vercel
      const seconds = Math.min(Number(input.seconds ?? 1), 25);
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      return { success: true, data: { waited_ms: seconds * 1000 } };
    }

    case 'transform_text': {
      let result = String(input.input ?? '');
      switch (input.operation) {
        case 'uppercase':   
          result = result.toUpperCase(); 
          break;
        case 'lowercase':   
          result = result.toLowerCase(); 
          break;
        case 'trim':        
          result = result.trim(); 
          break;
        case 'title_case':  
          result = result.replace(/\b\w/g, c => c.toUpperCase()); 
          break;
        case 'replace':
          result = result.replaceAll(String(input.search ?? ''), String(input.replacement ?? ''));
          break;
      }
      return { success: true, data: { result } };
    }

    case 'format_number': {
      const num = Number(input.number ?? 0);
      const decimals = Number(input.decimals ?? 0);
      let result: string;
      
      switch (input.format) {
        case 'vnd':     
          result = num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: decimals }); 
          break;
        case 'usd':     
          result = num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: Math.max(2, decimals) }); 
          break;
        case 'percent': 
          result = `${num.toFixed(decimals)}%`; 
          break;
        default:        
          result = num.toLocaleString('vi-VN', { maximumFractionDigits: decimals }); 
          break;
      }
      return { success: true, data: { result } };
    }

    default:
      return { success: false, error: `Core Logic action "${actionSlug}" chưa được hỗ trợ.` };
  }
}
