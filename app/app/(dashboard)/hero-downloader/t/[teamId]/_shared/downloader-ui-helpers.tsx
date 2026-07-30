import React from 'react';

export function getStatusRank(status: string) {
  if (status === 'downloading' || status === 'force_pending') return 1; // Đang tải: xếp đầu
  if (status === 'pending' || status === 'extracting' || status === 'paused') return 2; // Chờ tải: xếp giữa
  if (status === 'completed') return 3; // Tải xong: xếp dưới
  return 4; // Thất bại / Hủy: xếp dưới cùng
}

export function parseDownloaderError(error: string): React.ReactNode {
  if (error.includes('403') || error.includes('forbidden') || error.includes('Anti-bot') || error.includes('Sign')) {
    return <span>🔴 <strong>Lỗi Cookie/Anti-bot:</strong> Douyin/Bilibili chặn tải. Vui lòng cập nhật Cookie mới hoặc dùng Chrome Extension.</span>;
  }
  if (error.includes('data blocks') || error.includes('Remote end closed') || error.includes('Giving up')) {
    return <span>🔴 <strong>Bilibili CDN ngắt kết nối:</strong> Server từ chối truyền dữ liệu. Vui lòng thử lại hoặc cập nhật Cookie Bilibili.</span>;
  }
  if (error.includes('WinError 32') || error.includes('locked') || error.includes('being used')) {
    return <span>⚠️ <strong>File bị khóa:</strong> Tệp đang được mở bởi chương trình khác/OneDrive.</span>;
  }
  return <span>⚠️ {error}</span>;
}
