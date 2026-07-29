function groupYoutubeVideos(videos: any[]) {
   for (const v of videos) {
       let clean = v.title;
       
       // Remove common noise
       clean = clean.replace(/(?:\[|\()?(?:Full|Vietsub|Thuyết Minh|Lồng Tiếng|HD|4K|1080p)(?:\]|\))?/gi, '').trim();
       
       let epNum = 1;
       // Match: Tập 1, Phần 2, Part 3, Ep 4...
       const epRegex = /(?:Phần|Tập|Part|Ep|Episode|P)\s*\.?\s*0*([1-9][0-9]*)/i;
       const match = clean.match(epRegex);
       
       let baseTitle = clean;
       if (match) {
           epNum = parseInt(match[1]);
           baseTitle = clean.replace(match[0], '');
       } else {
           // Match standalone numbers like "- 06 -" or "| 10 |" or "[10/100]"
           const endRegex = /(?:-|\s|\||\[|\()\s*0*([1-9][0-9]*)\s*(?:\/[0-9]+)?\s*(?:\]|\)|\||-|$)/;
           const endMatch = clean.match(endRegex);
           if (endMatch) {
               epNum = parseInt(endMatch[1]);
               baseTitle = clean.replace(endMatch[0], ' ');
           } else {
               // Try to find "Tập cuối" or "Trọn bộ"
               if (/Tập cuối/i.test(clean)) {
                   epNum = 999;
                   baseTitle = clean.replace(/Tập cuối/i, '');
               } else if (/Trọn bộ/i.test(clean)) {
                   epNum = 1;
                   baseTitle = clean.replace(/Trọn bộ/i, '');
               }
           }
       }
       
       // Clean up brackets
       baseTitle = baseTitle.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
       
       // Take the first part before | or -
       const parts = baseTitle.split(/\||-/);
       baseTitle = parts.length > 0 ? parts[0].trim() : baseTitle.trim();
       
       if (!baseTitle) baseTitle = v.title.split(/\||-/)[0].trim();
       
       console.log(`Original: "${v.title}" => Base Title: "${baseTitle}", Ep: ${epNum}`);
   }
}

const testCases = [
  { title: "Nữ Cường Trở Lại - Tập 1 [Vietsub]" },
  { title: "Nữ Cường Trở Lại | Tập 2 | Phim Bộ" },
  { title: "[Thuyết Minh] Đại Tỷ - Tập 03 (Bản Đẹp)" },
  { title: "Tổng Tài Bá Đạo Phần 4 - Yêu Lại Từ Đầu" },
  { title: "Phim Hay 2024 - Tập 5/10 | Mới Nhất" },
  { title: "Trùng Sinh - 06 - Kênh Hay" },
  { title: "Quận Chúa Ma Vương Trở Về Vả Mặt Lũ Đạo Đức Giả - Tập Cuối" },
  { title: "Bị Đày Đến Vùng Đất Chết Tập 1" },
  { title: "Phim Ngắn: Hào Môn Tranh Đấu (Trọn Bộ)" },
  { title: "Chủ Tịch Giả Danh P3" }
];

groupYoutubeVideos(testCases);
