# PLAN_HEROVIDEO_FOLDER_SYNC — Cho phép kết nối thư mục tuỳ chọn & Đồng bộ Extension
> Ngày tạo: 2026-06-01
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 4
> Ước tính: ~30 phút cho Flash thực thi
> Nguồn: Dựa trên Audit báo cáo Giai đoạn 1 từ yêu cầu custom folder của user.

## MỤC TIÊU TỔNG
Bỏ ràng buộc bắt người dùng phải chọn đúng thư mục `Downloads/HeroVideo/[workspaceSlug]` trên Dashboard. Cho phép khách hàng tự do chọn hoặc tạo thư mục mới ở **bất kỳ đâu** trên máy tính thông qua File System Access API. 
Đồng thời, cấu trúc lại cơ chế truyền message để Dashboard gửi tên thư mục (customSubfolder) sang Chrome Extension, giúp Extension **tự động tải video về đúng thư mục đó** một cách thông minh mà không cần thao tác thêm.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG thay đổi các lệnh gọi File System Access API (`showDirectoryPicker`, `queryPermission`).
- KHÔNG sửa logic xoá hoặc quét files (`getAllVideoFiles`, `deleteVideoFile`).
- GIỮ NGUYÊN tính tương thích ngược cho Extension: nếu chưa chọn thư mục (customSubfolder undefined), fallback về mặc định `"HeroVideo/" + workspaceSlug`.
- Đảm bảo các message gửi đi an toàn (window.location.origin) và extension vẫn pass check origin.

## LESSONS CẦN NHỚ
- **1.2**: KHÔNG đổi tên biến/hàm đang chạy tốt (như hàm `ensureWorkspaceFolder` trong background.js, chỉ đổi signature tham số đầu tiên).
- Cập nhật đúng các interface TypeScript khi sửa type (`FileSystemContextType`).
- Single Source of Truth: Web App là nguồn quản lý cấu hình thư mục, tránh gửi message ghi đè từ nhiều file component.

---

## TASK 1: Bỏ ràng buộc thư mục trên File System Context

### 1.1. Mô tả
Hàm `isExpectedWorkspaceFolder` hiện tại chặn người dùng chọn thư mục có tên không khớp với `workspaceSlug`. Ta cần sửa logic để cho phép chọn mọi thư mục (luôn trả về true) và cập nhật thêm `folderName` vào context state để UI hiển thị.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/herovideodownload/dashboard/file-system-context.tsx` | MODIFY | ~10 dòng |

### 1.3. Code Snapshot tại điểm sửa
```typescript
interface FileSystemContextType {
  hasPermission: boolean;
  dirHandle: WorkspaceDirectoryHandle | null;
  requestPermission: () => Promise<void>;
// ...
  const isExpectedWorkspaceFolder = useCallback(
    (handle: WorkspaceDirectoryHandle) => {
      if (handle.name === workspaceSlug) return true;
      alert(`Hay chon dung thu muc workspace: ${workspaceSlug}`);
      return false;
    },
    [workspaceSlug],
  );
// ...
    <FileSystemContext.Provider
      value={{ hasPermission, dirHandle, requestPermission, verifyExistingPermission, getAllVideoFiles, deleteVideoFile }}
    >
```

### 1.4. Thay đổi cần thực hiện
1. **Sửa Interface**: Thêm `folderName: string | null;` vào `FileSystemContextType`.
2. **Sửa Hàm Kiểm Tra**:
```typescript
  const isExpectedWorkspaceFolder = useCallback(
    (handle: WorkspaceDirectoryHandle) => {
      // Cho phép chọn bất kỳ thư mục nào trên máy tính
      return true;
    },
    [],
  );
```
3. **Sửa Provider**:
```typescript
    <FileSystemContext.Provider
      value={{ 
        hasPermission, 
        dirHandle, 
        folderName: dirHandle ? dirHandle.name : null, 
        requestPermission, 
        verifyExistingPermission, 
        getAllVideoFiles, 
        deleteVideoFile 
      }}
    >
```

### 1.5. Vùng CẤM
- KHÔNG sửa logic lưu và đọc `idbGet`/`idbSet`.
- KHÔNG sửa logic đọc/xóa video file.

### 1.6. Phụ thuộc
Không phụ thuộc task khác. Làm ĐẦU TIÊN.

### 1.7. Verification
- TypeScript build không báo lỗi thiếu `folderName`.
- `pnpm build` thành công.

### 1.8. Kết quả mong đợi
- Người dùng có thể chọn bất kỳ thư mục nào mà không bị văng alert.

---

## TASK 2: Nâng cấp UI Video Grid & Đồng bộ Tự động

### 2.1. Mô tả
Dashboard cần hiển thị tên thư mục thực tế thay vì slug. Nút "Mở thư mục" cần truyền tên thư mục `folderName` thật sang Extension. Hơn nữa, tự động phát tín hiệu đồng bộ `HERO_VIDEO_ENSURE_WORKSPACE_FOLDER` khi component render xong mà đã có kết nối.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/herovideodownload/dashboard/video-list-client.tsx` | MODIFY | ~30 dòng |
| `app/app/(dashboard)/herovideodownload/dashboard/extension-status.tsx` | MODIFY | ~3 dòng |

### 2.3. Code Snapshot tại điểm sửa
`video-list-client.tsx`:
```tsx
function VideoGrid({ workspaceSlug }: VideoListClientProps) {
  const { hasPermission, dirHandle, requestPermission, verifyExistingPermission, getAllVideoFiles, deleteVideoFile } = useFileSystem();
// ...
  const handleOpenFolder = async () => {
    const folderPath = `HeroVideo\\${workspaceSlug}`;

      try {
      await navigator.clipboard?.writeText(folderPath);
      showToast('Đã copy tên thư mục Workspace. Extension sẽ tạo/mở đúng thư mục Workspace.', 'success');
// ...
    window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, open: true }, window.location.origin);
  };
// ...
          <span className="text-sm text-emerald-400 font-medium">Đã kết nối thư mục Workspace: {workspaceSlug}</span>
// ...
            {dirHandle
              ? `Bạn đã kết nối thư mục trước đó. Hãy xác nhận lại quyền truy cập thư mục Workspace: ${workspaceSlug}.`
              : `Để đọc/xóa video đúng Workspace, hãy chọn trực tiếp thư mục Workspace "${workspaceSlug}" trong Downloads/HeroVideo.`}
```
`extension-status.tsx`:
```tsx
        } else {
           setStatus('connected');
           window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, open: false }, window.location.origin);
        }
```

### 2.4. Thay đổi cần thực hiện
1. **Trong `extension-status.tsx`**: Xóa dòng `window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER'...` (Dòng 25) để tránh ghi đè thư mục khi chưa có thông tin `folderName`.
2. **Trong `video-list-client.tsx`**:
   - Destructure thêm `folderName` từ `useFileSystem()`: `const { hasPermission, dirHandle, folderName, ... } = useFileSystem();`
   - Sửa `handleOpenFolder`:
     ```tsx
       const handleOpenFolder = async () => {
         const displayFolderName = folderName || `HeroVideo\\${workspaceSlug}`;
         try {
           await navigator.clipboard?.writeText(displayFolderName);
           showToast(`Đã copy tên thư mục Workspace: ${displayFolderName}. Extension sẽ mở đúng thư mục này.`, 'success');
         } catch (error) {
           console.warn('Clipboard copy failed:', error);
         }
         window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, customSubfolder: folderName || undefined, open: true }, window.location.origin);
       };
     ```
   - Thêm `useEffect` để đồng bộ tự động ngay trên dòng `fetchFiles`:
     ```tsx
       useEffect(() => {
         if (hasPermission && dirHandle) {
           window.postMessage({ type: 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER', workspaceSlug, customSubfolder: dirHandle.name, open: false }, window.location.origin);
         }
       }, [hasPermission, dirHandle, workspaceSlug]);
     ```
   - Cập nhật text UI:
     - Đổi `"Đã kết nối thư mục Workspace: {workspaceSlug}"` thành `"Đã kết nối thư mục Workspace: {folderName || workspaceSlug}"`.
     - Đổi đoạn text `"Để đọc/xóa video đúng Workspace, hãy chọn trực tiếp..."` thành `"Để quản lý video, hãy chọn một thư mục bất kỳ trên máy tính của bạn (Extension sẽ tự động đồng bộ)."`

### 2.5. Vùng CẤM
- KHÔNG sửa UI của các button Cleanup, Quét video.
- KHÔNG xóa event listener trong `extension-status.tsx`.

### 2.6. Phụ thuộc
Phải có `folderName` ở Task 1.

### 2.7. Verification
- `pnpm build` không lỗi. UI hiển thị text chuẩn.

### 2.8. Kết quả mong đợi
- Web App tự động post tin nhắn `HERO_VIDEO_ENSURE_WORKSPACE_FOLDER` kèm `customSubfolder` ngay khi connect folder.

---

## TASK 3: Extension Content Script - Cập nhật logic đồng bộ Subfolder

### 3.1. Mô tả
`content-script.js` cần lưu cấu hình vào Storage theo giá trị `customSubfolder` (nếu Web truyền sang) thay vì luôn gán cứng `"HeroVideo/" + workspaceSlug`. Message gửi qua `runtime.sendMessage` cũng phải truyền thông tin `subfolderPath` này.

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/extension/herovideo/js/content-script.js` | MODIFY | ~20 dòng |

### 3.3. Code Snapshot tại điểm sửa
```javascript
    function setWorkspaceSubfolder(workspaceSlug) {
        if (!workspaceSlug) return;
        chrome.storage.local.set({ herovideo_subfolder: "HeroVideo/" + workspaceSlug });
    }
// ...
        if (event.data && event.data.type === 'HERO_VIDEO_EXT_CHECK') {
            const { workspaceSlug } = event.data;
            setWorkspaceSubfolder(workspaceSlug);
// ...
        if (event.data && event.data.type === 'HERO_VIDEO_ENSURE_WORKSPACE_FOLDER') {
            setWorkspaceSubfolder(event.data.workspaceSlug);
            chrome.runtime.sendMessage({
                Message: "ensureWorkspaceFolder",
                workspaceSlug: event.data.workspaceSlug,
                open: Boolean(event.data.open)
            });
        }
```

### 3.4. Thay đổi cần thực hiện
1. **Sửa `setWorkspaceSubfolder`**:
```javascript
    function setWorkspaceSubfolder(workspaceSlug, customSubfolder) {
        if (customSubfolder) {
            chrome.storage.local.set({ herovideo_subfolder: customSubfolder });
        } else if (workspaceSlug) {
            chrome.storage.local.set({ herovideo_subfolder: "HeroVideo/" + workspaceSlug });
        }
    }
```
2. **Sửa hàm xử lý messages**:
- Trong `HERO_VIDEO_EXT_CHECK`:
```javascript
            const { workspaceSlug, customSubfolder } = event.data;
            setWorkspaceSubfolder(workspaceSlug, customSubfolder);
```
- Trong `HERO_VIDEO_OPEN_FOLDER`:
```javascript
            setWorkspaceSubfolder(event.data.workspaceSlug, event.data.customSubfolder);
            const subfolderPath = event.data.customSubfolder || ("HeroVideo/" + event.data.workspaceSlug);
            chrome.runtime.sendMessage({ Message: "ensureWorkspaceFolder", subfolderPath: subfolderPath, open: true });
```
- Trong `HERO_VIDEO_ENSURE_WORKSPACE_FOLDER`:
```javascript
            setWorkspaceSubfolder(event.data.workspaceSlug, event.data.customSubfolder);
            const subfolderPath = event.data.customSubfolder || ("HeroVideo/" + event.data.workspaceSlug);
            chrome.runtime.sendMessage({
                Message: "ensureWorkspaceFolder",
                subfolderPath: subfolderPath,
                open: Boolean(event.data.open)
            });
```

### 3.5. Vùng CẤM
- KHÔNG sửa block code downloader, m3u8.
- KHÔNG thay đổi origin checker `isAllowedAi2HeroOrigin`.

### 3.6. Phụ thuộc
Độc lập, có thể làm ngay.

### 3.7. Verification
- Grep `customSubfolder` trong `content-script.js` thấy xuất hiện ở 4 vị trí trên.

### 3.8. Kết quả mong đợi
- Giá trị `herovideo_subfolder` trong storage của Chrome được cập nhật chuẩn xác.

---

## TASK 4: Hỗ trợ tạo file mốc Marker tuỳ biến trên Background

### 4.1. Mô tả
`background.js` hiện gán cứng thư mục `HeroVideo/${safeSlug}` khi muốn tạo file marker `_ai2hero_open_folder.txt`. Cần cập nhật để nhận tham số `subfolderPath` tổng quát, tương thích với cả kiểu custom và cũ.

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/extension/herovideo/js/background.js` | MODIFY | ~15 dòng |

### 4.3. Code Snapshot tại điểm sửa
```javascript
function ensureWorkspaceFolder(workspaceSlug, openFolder, sendResponse) {
    const safeSlug = sanitizeWorkspaceSlug(workspaceSlug);
    if (!safeSlug) {
        sendResponse?.({ ok: false, error: "missing_workspace_slug" });
        return;
    }

    const filename = `HeroVideo/${safeSlug}/${AI2HERO_FOLDER_MARKER}`;
// ...
    if (Message.Message == "ensureWorkspaceFolder") {
        ensureWorkspaceFolder(Message.workspaceSlug, Boolean(Message.open), sendResponse);
        return true;
    }
```

### 4.4. Thay đổi cần thực hiện
1. **Sửa `ensureWorkspaceFolder`**:
```javascript
function ensureWorkspaceFolder(subfolderPath, openFolder, sendResponse) {
    if (!subfolderPath) {
        sendResponse?.({ ok: false, error: "missing_subfolder_path" });
        return;
    }

    // Không cần chạy sanitizeWorkspaceSlug vì subfolderPath có thể là đường dẫn tuỳ ý
    // (như "MyFolder" hoặc "HeroVideo/team-1")
    const filename = `${subfolderPath}/${AI2HERO_FOLDER_MARKER}`;
```
Lưu ý: đổi tất cả các biến `safeSlug` bên dưới `ensureWorkspaceFolder` thành `subfolderPath` (ở đoạn `markers[subfolderPath] = downloadId`).

2. **Sửa chỗ gọi `ensureWorkspaceFolder` (Listener)**:
```javascript
    if (Message.Message == "ensureWorkspaceFolder") {
        const targetPath = Message.subfolderPath || ("HeroVideo/" + Message.workspaceSlug);
        ensureWorkspaceFolder(targetPath, Boolean(Message.open), sendResponse);
        return true;
    }
```

### 4.5. Vùng CẤM
- KHÔNG xoá logic `openDownloadWhenComplete` hay `chrome.downloads.download`.
- KHÔNG đụng vào logic alarm, ffmpeg.

### 4.6. Phụ thuộc
Phụ thuộc logic Task 3.

### 4.7. Verification
- Grep `subfolderPath` trong `background.js` xác định nó được nhận làm tham số của `ensureWorkspaceFolder` thay vì `workspaceSlug`.

### 4.8. Kết quả mong đợi
- Mở đúng thư mục Chrome tải file vào, bất kể người dùng chọn thư mục tên gì!

---

## THỨ TỰ THỰC HIỆN
`Task 1` -> `Task 2` -> `Task 3` -> `Task 4`

## SAU KHI HOÀN TẤT
1. Cập nhật `START.md` đánh dấu hoàn thành Custom Folder Sync cho HeroVideo.
2. Build lại dashboard `pnpm build`.
