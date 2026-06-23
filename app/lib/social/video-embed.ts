export function parseVideoUrl(url: string): {
  provider: 'youtube' | 'tiktok' | 'vimeo' | 'direct' | null;
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
} {
  if (!url) {
    return { provider: null, videoId: null, embedUrl: null, thumbnailUrl: null };
  }

  const trimmedUrl = url.trim();

  // 1. YouTube Regex
  const ytRegex = /(?:youtube\.com\/(?:[^\/\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const ytMatch = trimmedUrl.match(ytRegex);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    };
  }

  // 2. Vimeo Regex
  const vimeoRegex = /(?:vimeo\.com\/)(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|showcase\/(\d+)\/video\/|)(\d+)/;
  const vimeoMatch = trimmedUrl.match(vimeoRegex);
  if (vimeoMatch) {
    const videoId = vimeoMatch[4];
    return {
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      thumbnailUrl: null
    };
  }

  // 3. TikTok Regex
  const tiktokRegex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/;
  const tiktokMatch = trimmedUrl.match(tiktokRegex);
  if (tiktokMatch) {
    const videoId = tiktokMatch[1];
    return {
      provider: 'tiktok',
      videoId,
      embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
      thumbnailUrl: null
    };
  }

  // 4. Direct video files
  const isDirectVideo = /\.(mp4|webm|mov|ogg)(?:\?|$)/i.test(trimmedUrl);
  if (isDirectVideo) {
    return {
      provider: 'direct',
      videoId: null,
      embedUrl: trimmedUrl,
      thumbnailUrl: null
    };
  }

  return { provider: null, videoId: null, embedUrl: null, thumbnailUrl: null };
}