'use client';

import { useState, useCallback, useEffect } from 'react';

export function useFileSystemAccess() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  // Thử khôi phục từ IndexedDB (nâng cao, ở đây tạm thời lưu state trong RAM)
  // Để đơn giản và an toàn, ta yêu cầu user chọn lại khi refresh.

  const requestPermission = useCallback(async () => {
    try {
      // @ts-ignore - File System Access API
      if (!window.showDirectoryPicker) {
        alert('Trình duyệt của bạn không hỗ trợ File System Access API (hãy dùng Chrome/Edge).');
        return;
      }
      
      // @ts-ignore
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      
      setDirHandle(handle);
      setHasPermission(true);
      return handle;
    } catch (err) {
      console.error('User cancelled or error:', err);
      return null;
    }
  }, []);

  // Hàm tìm file theo tên (hỗ trợ tìm file bị thêm hậu tố như (1), (2) của Windows)
  const findVideoFile = useCallback(async (baseName: string) => {
    if (!dirHandle) return null;
    
    try {
      // Xử lý baseName (VD: "TikTok - Make Your Day.mp4")
      const nameWithoutExt = baseName.replace(/\.[^/.]+$/, "");
      const ext = baseName.split('.').pop();

      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          // Khớp chính xác
          if (entry.name === baseName) {
            return await entry.getFile();
          }
          // Khớp hậu tố (VD: TikTok - Make Your Day (1).mp4)
          if (entry.name.startsWith(nameWithoutExt) && entry.name.endsWith(`.${ext}`)) {
            return await entry.getFile();
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Error finding file:', err);
      return null;
    }
  }, [dirHandle]);

  // Hàm xóa file
  const deleteVideoFile = useCallback(async (fileName: string) => {
    if (!dirHandle) return false;
    try {
      // Tìm tên file chính xác trên ổ cứng
      let targetName = fileName;
      let found = false;
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      const ext = fileName.split('.').pop();

      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          if (entry.name === fileName || (entry.name.startsWith(nameWithoutExt) && entry.name.endsWith(`.${ext}`))) {
            targetName = entry.name;
            found = true;
            break;
          }
        }
      }

      if (found) {
        // @ts-ignore
        await dirHandle.removeEntry(targetName);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Lỗi khi xóa file local:', err);
      return false;
    }
  }, [dirHandle]);

  return {
    dirHandle,
    hasPermission,
    requestPermission,
    findVideoFile,
    deleteVideoFile
  };
}
