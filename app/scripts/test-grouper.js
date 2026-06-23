function groupYoutubeVideos(videos: any[]) {
  const groups = new Map();
  for (const v of videos) {
      let clean = v.title.replace(/(?:\[|\()?(?:Full|Vietsub|Thuyết Minh|HD|4K|1080p|Trọn Bộ)(?:\]|\))?/gi, '').trim();
      let epNum = 1;
      
      // Improve regex to catch things like "Phần 1", "Tập 1", "Phần 1,2,3" etc.
      // Sometimes people write "Tập 1-3" or "Phần 1 Full"
      const epRegex = /(?:Phần|Tập|Part|P)\s*\.?\s*([0-9]+)(?:\s*[-|:|\|]\s*|\s+|$)/i;
      const match = clean.match(epRegex);
      let baseTitle = clean;
      
      if (match) {
          epNum = parseInt(match[1]);
          baseTitle = clean.replace(match[0], '').trim();
      } else {
          const endRegex = /(?:-|\s|\|)\s*([0-9]+)$/;
          const endMatch = clean.match(endRegex);
          if (endMatch) {
              epNum = parseInt(endMatch[1]);
              baseTitle = clean.replace(endMatch[0], '').trim();
          }
      }
      baseTitle = baseTitle.replace(/^[-|:|\|]\s*/, '').replace(/\s*[-|:|\|]$/, '').trim();
      if(!baseTitle) baseTitle = v.title;
      
      let foundKey = null;
      const normalizedBase = baseTitle.toLowerCase().replace(/[^a-z0-9]/gi, '');
      
      for (const key of groups.keys()) {
           const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/gi, '');
           if (normalizedKey.length > 5 && normalizedBase.length > 5) {
               if (normalizedKey.includes(normalizedBase) || normalizedBase.includes(normalizedKey)) {
                   foundKey = key;
                   break;
               }
           } else {
               if (normalizedKey === normalizedBase) {
                   foundKey = key; break;
               }
           }
      }
      
      const finalKey = foundKey || baseTitle;
      if(!groups.has(finalKey)) {
          groups.set(finalKey, []);
      }
      groups.get(finalKey).push({ ...v, epNum, baseTitle: finalKey });
  }
  return groups;
}

const mockVideos = [
  { title: "Phim Ngắn: Đại Đường Tiêu Dao Vương - Phần 1" },
  { title: "Đại Đường Tiêu Dao Vương - Phần 2 (Thuyết Minh)" },
  { title: "Đại Đường Tiêu Dao Vương Phần 3 Full" },
  { title: "Bách Chức Huyện Lệnh (Huyện Lệnh Chảo Trắng) - Tập 1" },
  { title: "Bách Chức Huyện Lệnh Tập 2" }
];

console.dir(groupYoutubeVideos(mockVideos), { depth: null });
