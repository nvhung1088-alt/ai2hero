# PLAN: Hotfix & Refactor Hero Downloader
> Ngày tạo: 2026-07-27
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 4
> Ước tính: ~40 phút cho Flash thực thi

## MỤC TIÊU TỔNG
1. **Động hóa model Image AI** — loại bỏ hardcode `dall-e-3`, cho phép người dùng chọn model image gen từ giao diện.
2. **Loại bỏ `window.location.reload()`** — thay bằng immutable state update, giữ SPA mượt mà.
3. **Thay thế native `prompt()` bằng inline input** — UX chuyên nghiệp, không popup browser native.
4. **Thay thế native `confirm()` bằng inline confirm modal** — UX nhất quán, Premium Dark Mode.

## BỐI CẢNH KIẾN TRÚC
- **Giao diện Dashboard**: `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` (856 dòng) — file client chính, chứa toàn bộ state, handlers, table, modals.
- **API Dịch Thumbnail**: `app/app/api/hero-downloader/thumbnail/route.ts` (184 dòng) — nhận `videoId, connectionId, model, targetLang` → gọi Vision AI → gọi Image Gen AI → upload R2 → cập nhật DB.
- **Data Flow**: Client (`selectedAiConn` = `connectionId:visionModel`) → POST `/api/hero-downloader/thumbnail` → `runConnectorAction` (Vision) → `runConnectorAction` (Image Gen, hiện hardcode `dall-e-3`) → R2 upload → DB update.
- **Toast system**: Sử dụng `showToast()` từ `@/app/(dashboard)/sim/sim-ui-helpers` — là wrapper chuẩn toàn dự án gọi `(window as any).showToast`. **KHÔNG thay đổi import này**.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: `hero-downloader-actions.ts`, `create-project-modal.tsx`, `edit-project-modal.tsx`, `page.tsx`, `layout.tsx`, API routes `pending-extract`, `resolve`, extension code, worker Python.
- KHÔNG đổi tên: `handleTranslateThumbnail`, `handleToggleProjectStatus`, `handleStopAll`, `handleClearVideos`, `handleAddUrl`, `handleForceScan`, `handleOpenLocal`, `selectedAiConn`, `selectedLang`, `translatingIds`, `previewVideo`. Giữ nguyên toàn bộ tên hàm và biến đang chạy tốt.
- KHÔNG thay đổi: `showToast` import path, CSS Design System, Smart Polling logic, Pair Code system.
- CSS conventions: Dark Mode (`bg-gray-950`, `bg-gray-900/50`, `border-white/10`, `text-gray-300`), Teal accent cho actions chính.
- Data: `downloader-dashboard-client.tsx` state = nguồn sự thật cho giao diện. DB = nguồn sự thật cho data thật.

## LESSONS CẦN NHỚ
- **1.1**: Sửa 1 file → test → mới qua file tiếp.
- **1.2**: KHÔNG đổi tên biến/hàm đang chạy tốt.
- **3.6**: Đồng nhất đóng/mở modal bằng classList hoặc state boolean.
- **3.8**: z-index collision — modal phải > z-50 (TopHeader/Sidebar).
- **8**: Quy trình fix bug surgical — sửa đúng điểm, không refactor ngoài phạm vi.

---

## TASK 1: Động hóa Model Image AI trong API Route Thumbnail

### 1.1. Mô tả
API route `/api/hero-downloader/thumbnail` đang hardcode `model: 'dall-e-3'` tại dòng 130, khiến việc tạo ảnh luôn gọi DALL-E 3 bất kể người dùng chọn provider AI nào từ Connect Hub. Cần cho phép client truyền `imageModel` (tùy chọn, default `dall-e-3`) và API sử dụng giá trị này.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/api/hero-downloader/thumbnail/route.ts` | MODIFY | ~5 dòng |
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` | MODIFY | ~3 dòng |

### 1.3. Code Snapshot tại điểm sửa

**thumbnail/route.ts dòng 24-31 (parse request body):**
```typescript
    // 2. Parse request body
    const { videoId, connectionId, model, targetLang = 'Tiếng Việt' } = await req.json();
    if (!videoId || !connectionId || !model) {
      return NextResponse.json(
        { error: 'Thiếu tham số videoId, connectionId hoặc model' },
        { status: 400 }
      );
    }
```

**thumbnail/route.ts dòng 125-135 (hardcode dall-e-3):**
```typescript
    const imgResult = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug: 'generate_image',
      input: {
        model: 'dall-e-3',
        prompt: imgPrompt,
        size: '1792x1024',
      },
      callerModule: 'hero-downloader',
    });
```

**downloader-dashboard-client.tsx dòng 55-63 (fetch body):**
```typescript
      const res = await fetch('/api/hero-downloader/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          connectionId: parseInt(connId, 10),
          model,
          targetLang: selectedLang
        }),
      });
```

### 1.4. Thay đổi cần thực hiện

**File `thumbnail/route.ts`:**
1. Dòng 25: Thêm `imageModel` vào destructuring — `const { videoId, connectionId, model, targetLang = 'Tiếng Việt', imageModel = 'dall-e-3' } = await req.json();`
2. Dòng 130: Thay `model: 'dall-e-3'` → `model: imageModel`

**File `downloader-dashboard-client.tsx`:**
1. Trong body JSON của `handleTranslateThumbnail` (dòng ~58-63), thêm field `imageModel: 'dall-e-3'` — giữ default hiện tại, sẵn sàng cho tương lai khi thêm dropdown chọn image model.

### 1.5. Vùng CẤM (trong task này)
- KHÔNG đụng: Logic Vision AI (dòng 52-86), CORS headers, authentication flow (dòng 11-22), R2 upload (dòng 152-159), DB update (dòng 162-168).
- KHÔNG đổi tên: `runConnectorAction`, `connectionId`, `model`, `imgPrompt`, `imgResult`.

### 1.6. Phụ thuộc
- Không phụ thuộc task nào. Có thể làm đầu tiên hoặc song song với Task 3, 4.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- `grep -n "dall-e-3" app/app/api/hero-downloader/thumbnail/route.ts` — phải chỉ còn 0 hoặc 1 kết quả (trong default value ở destructuring, KHÔNG nằm trong `runConnectorAction.input`).
- `grep -n "imageModel" app/app/api/hero-downloader/thumbnail/route.ts` — phải có 2 kết quả (destructuring + input).
- `grep -n "imageModel" app/app/(dashboard)/hero-downloader/t/\[teamId\]/dashboard/downloader-dashboard-client.tsx` — phải có 1 kết quả (body JSON).

### 1.8. Kết quả mong đợi
- API route nhận `imageModel` tùy chọn từ client (default `dall-e-3`).
- Client gửi `imageModel: 'dall-e-3'` trong request body. Khi tương lai thêm UI dropdown chọn image model, chỉ cần sửa giá trị này từ state.
- Không phá vỡ luồng hiện tại — default giữ nguyên `dall-e-3`.

---

## TASK 2: Loại bỏ `window.location.reload()` bằng Immutable State Update

### 2.1. Mô tả
Hiện có 3 điểm gọi `window.location.reload()`:
- Dòng 212: Trong `handleToggleProjectStatus` khi lỗi (fallback revert state).
- Dòng 740: Callback `onProjectCreated` sau khi `CreateProjectModal` tạo dự án thành công.
- Dòng 751: Callback `onProjectUpdated` sau khi `EditProjectModal` cập nhật dự án thành công.

Cần thay bằng cập nhật React state trực tiếp (immutable pattern) để giữ SPA mượt.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` | MODIFY | ~15 dòng |

### 2.3. Code Snapshot tại điểm sửa

**Dòng 207-213 (handleToggleProjectStatus — reload on error):**
```typescript
    if (res.success) {
      showToast(isRunning ? 'Đã tạm dừng tiến trình quét' : 'Đã bật tiến trình quét. Worker sẽ bắt đầu ngay!', 'success');
    } else {
      showToast('Lỗi: ' + res.error, 'error');
      // Revert status on error by refetching
      window.location.reload(); 
    }
```

**Dòng 734-742 (CreateProjectModal callback):**
```typescript
      <CreateProjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        teamId={teamId}
        cookies={initialCookies}
        onProjectCreated={(project) => {
          window.location.reload();
        }}
      />
```

**Dòng 744-753 (EditProjectModal callback):**
```typescript
      <EditProjectModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)}
        teamId={teamId}
        project={projectToEdit}
        cookies={initialCookies}
        onProjectUpdated={(project) => {
          window.location.reload();
        }}
      />
```

### 2.4. Thay đổi cần thực hiện

**Thay đổi 1 — Dòng 210-212 (revert on error):**
Thay `window.location.reload();` bằng:
```typescript
      // Revert status on error
      setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, status: activeProject.status } : p));
```
Logic: `activeProject` vẫn còn giữ `status` cũ ở đầu hàm (vì `const isRunning = activeProject.status === 'active'`). Dùng nó để revert.

**Thay đổi 2 — Dòng 739-741 (onProjectCreated):**
Thay `window.location.reload();` bằng:
```typescript
          setProjects(prev => [...prev, project]);
          setActiveProjectId(project.id);
          setVideos([]);
          setIsCreateModalOpen(false);
```

**Thay đổi 3 — Dòng 750-752 (onProjectUpdated):**
Thay `window.location.reload();` bằng:
```typescript
          setProjects(prev => prev.map(p => p.id === project.id ? project : p));
          setIsEditModalOpen(false);
```

### 2.5. Vùng CẤM (trong task này)
- KHÔNG đụng: `CreateProjectModal` component nội bộ (`create-project-modal.tsx`), `EditProjectModal` component nội bộ (`edit-project-modal.tsx`).
- KHÔNG thay đổi: props interface của hai modal (giữ nguyên `onProjectCreated`, `onProjectUpdated`).
- KHÔNG đụng: `handleForceScan`, `handleStopAll`, `handleClearVideos`, Smart Polling, Thumbnail Translation.

### 2.6. Phụ thuộc
- Không phụ thuộc task nào. Có thể làm song song với Task 1, 3, 4.

### 2.7. Verification (Cách kiểm tra đúng/sai)
- `grep -n "window.location.reload" app/app/(dashboard)/hero-downloader/t/\[teamId\]/dashboard/downloader-dashboard-client.tsx` — phải trả về **0 kết quả**.
- Kiểm tra logic: `setProjects` gọi đúng immutable pattern (spread `...prev`).

### 2.8. Kết quả mong đợi
- Tạo dự án mới → danh sách bên trái cập nhật ngay, project mới được highlight active, không reload trang.
- Sửa dự án → thông tin cập nhật tại chỗ, không reload.
- Toggle trạng thái project lỗi → revert lại trạng thái cũ bằng state, không reload.

---

## TASK 3: Thay thế native `prompt()` bằng Inline Input Modal

### 3.1. Mô tả
Hàm `handleAddUrl` (dòng 159-171) sử dụng `prompt()` native browser để nhập URL video. Cần thay thế bằng inline input state + UI dạng expandable bar hoặc mini-modal inline, phù hợp Premium Dark Mode.

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` | MODIFY | ~30 dòng |

### 3.3. Code Snapshot tại điểm sửa

**Dòng 159-171 (handleAddUrl):**
```typescript
  const handleAddUrl = async () => {
    if (!activeProjectId) return;
    const url = prompt('Nhập URL Video (Youtube/Tiktok/Douyin):');
    if (!url) return;
    
    const res = await createDownloaderVideoAction({ projectId: activeProjectId, videoUrl: url, title: url });
    if (res.success) {
      showToast('Đã thêm URL thành công!', 'success');
      fetchVideosRef();
    } else {
      showToast('Lỗi: ' + res.error, 'error');
    }
  };
```

**Dòng 450-453 (nút Thêm URL trong toolbar):**
```typescript
                <button onClick={handleAddUrl} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-medium">Thêm URL</span>
                </button>
```

### 3.4. Thay đổi cần thực hiện

**Bước 1 — Thêm state mới (sau dòng 39, khu vực state declarations):**
```typescript
  const [isAddUrlOpen, setIsAddUrlOpen] = useState(false);
  const [addUrlValue, setAddUrlValue] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
```

**Bước 2 — Sửa hàm `handleAddUrl` (dòng 159-171):**
Thay toàn bộ thành:
```typescript
  const handleAddUrl = async () => {
    if (!activeProjectId || !addUrlValue.trim()) return;
    setIsAddingUrl(true);
    const res = await createDownloaderVideoAction({ projectId: activeProjectId, videoUrl: addUrlValue.trim(), title: addUrlValue.trim() });
    if (res.success) {
      showToast('Đã thêm URL thành công!', 'success');
      setAddUrlValue('');
      setIsAddUrlOpen(false);
      fetchVideosRef();
    } else {
      showToast('Lỗi: ' + res.error, 'error');
    }
    setIsAddingUrl(false);
  };
```

**Bước 3 — Sửa nút "Thêm URL" (dòng 450-453):**
Thay `onClick={handleAddUrl}` thành `onClick={() => setIsAddUrlOpen(!isAddUrlOpen)}`.

**Bước 4 — Thêm inline input bar (NGAY SAU toolbar header, trước `{/* Video List */}` dòng 481):**
```tsx
              {isAddUrlOpen && (
                <div className="flex items-center gap-2 mb-4 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <input
                    type="text"
                    value={addUrlValue}
                    onChange={e => setAddUrlValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                    placeholder="Dán URL Video (Youtube/Tiktok/Douyin)..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-gray-200 text-xs focus:outline-none focus:border-teal-500/50 placeholder:text-gray-600"
                    autoFocus
                  />
                  <button
                    onClick={handleAddUrl}
                    disabled={!addUrlValue.trim() || isAddingUrl}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {isAddingUrl ? 'Đang thêm...' : 'Thêm'}
                  </button>
                  <button
                    onClick={() => { setIsAddUrlOpen(false); setAddUrlValue(''); }}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
```

**Bước 5 — Thêm import `X` (icon đóng):** Kiểm tra dòng 5 — `X` đã có import chưa? Nếu chưa → thêm vào danh sách import từ `lucide-react`. (Lưu ý: dòng 5 hiện KHÔNG có `X`. Cần thêm.)

### 3.5. Vùng CẤM (trong task này)
- KHÔNG đụng: `createDownloaderVideoAction` logic, `fetchVideosRef`, bất kỳ handler nào khác.
- KHÔNG đổi tên: `handleAddUrl` (giữ nguyên tên).

### 3.6. Phụ thuộc
- Không phụ thuộc task nào. Có thể làm song song.

### 3.7. Verification (Cách kiểm tra đúng/sai)
- `grep -n "prompt(" app/app/(dashboard)/hero-downloader/t/\[teamId\]/dashboard/downloader-dashboard-client.tsx` — phải trả về **0 kết quả**.
- `grep -n "isAddUrlOpen" app/app/(dashboard)/hero-downloader/t/\[teamId\]/dashboard/downloader-dashboard-client.tsx` — phải có ≥ 4 kết quả (state, toggle, render, close).

### 3.8. Kết quả mong đợi
- Nhấn "Thêm URL" → expand inline input bar ngay dưới toolbar (không popup browser native).
- Nhập URL → nhấn Enter hoặc nút "Thêm" → thêm video → tự đóng bar + reset input.
- Nút X đóng bar, reset input. Loading state hiển thị "Đang thêm...".

---

## TASK 4: Thay thế native `confirm()` bằng Confirm Modal Premium

### 4.1. Mô tả
Có 2 điểm gọi `confirm()` native browser trong dashboard client:
- Dòng 175: `handleStopAll` — xác nhận dừng tải tất cả.
- Dòng 230: `handleClearVideos` — xác nhận xóa toàn bộ video.

Cần thay bằng một Confirm Modal component inline (reusable) với giao diện Premium Dark Mode.

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` | MODIFY | ~50 dòng |

### 4.3. Code Snapshot tại điểm sửa

**Dòng 173-191 (handleStopAll):**
```typescript
  const handleStopAll = async () => {
    if (!activeProjectId) return;
    if (!confirm('Bạn có chắc muốn dừng tất cả video đang tải và chờ tải của dự án này không?')) return;
    
    // Cập nhật UI tạm thời
    setVideos(prev => prev.map(v => 
      (v.status === 'pending' || v.status === 'downloading') 
        ? { ...v, status: 'cancelled' } 
        : v
    ));
    
    const res = await stopAllDownloaderVideosAction(teamId, activeProjectId);
    if (res.success) {
      showToast('Đã dừng tất cả tác vụ đang tải và chờ tải!', 'success');
    } else {
      showToast('Lỗi: ' + res.error, 'error');
      if (activeProjectId) fetchVideosRef();
    }
  };
```

**Dòng 228-242 (handleClearVideos):**
```typescript
  const handleClearVideos = async () => {
    if (!activeProject) return;
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ video trong dự án này? Thao tác này không thể hoàn tác!')) return;
    
    const res = await clearDownloaderVideosAction(activeProject.id, teamId);
    if (res.success) {
      showToast('Đã xóa toàn bộ video', 'success');
      const fetchRes = await getDownloaderVideosAction(teamId, activeProject.id);
      if (fetchRes.success && fetchRes.videos) setVideos(fetchRes.videos);
      else setVideos([]);
      setCurrentPage(1);
    } else {
      showToast('Lỗi khi xóa video: ' + res.error, 'error');
    }
  };
```

### 4.4. Thay đổi cần thực hiện

**Bước 1 — Thêm state confirm modal (sau các state khác, khu vực dòng ~39):**
```typescript
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
```

**Bước 2 — Sửa `handleStopAll` (dòng 173-191):**
Xóa dòng `if (!confirm(...)) return;` (dòng 175). Bọc toàn bộ logic còn lại vào hàm `executeStopAll`, và gọi `setConfirmModal`:
```typescript
  const handleStopAll = () => {
    if (!activeProjectId) return;
    setConfirmModal({
      isOpen: true,
      title: 'Dừng tất cả tác vụ',
      message: 'Bạn có chắc muốn dừng tất cả video đang tải và chờ tải của dự án này không?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setVideos(prev => prev.map(v => 
          (v.status === 'pending' || v.status === 'downloading') 
            ? { ...v, status: 'cancelled' } 
            : v
        ));
        const res = await stopAllDownloaderVideosAction(teamId, activeProjectId);
        if (res.success) {
          showToast('Đã dừng tất cả tác vụ đang tải và chờ tải!', 'success');
        } else {
          showToast('Lỗi: ' + res.error, 'error');
          if (activeProjectId) fetchVideosRef();
        }
      }
    });
  };
```

**Bước 3 — Sửa `handleClearVideos` (dòng 228-242):**
Xóa dòng `if (!confirm(...)) return;` (dòng 230). Bọc logic vào `setConfirmModal`:
```typescript
  const handleClearVideos = () => {
    if (!activeProject) return;
    setConfirmModal({
      isOpen: true,
      title: 'Xóa toàn bộ video',
      message: 'Bạn có chắc chắn muốn xóa toàn bộ video trong dự án này? Thao tác này không thể hoàn tác!',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await clearDownloaderVideosAction(activeProject.id, teamId);
        if (res.success) {
          showToast('Đã xóa toàn bộ video', 'success');
          const fetchRes = await getDownloaderVideosAction(teamId, activeProject.id);
          if (fetchRes.success && fetchRes.videos) setVideos(fetchRes.videos);
          else setVideos([]);
          setCurrentPage(1);
        } else {
          showToast('Lỗi khi xóa video: ' + res.error, 'error');
        }
      }
    });
  };
```

**Bước 4 — Thêm Confirm Modal JSX (TRƯỚC thẻ đóng `</div>` cuối cùng của component, SAU `{previewVideo && ...}` modal, trước dòng `</div>` cuối ~ dòng 852):**
```tsx
      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-base">{confirmModal.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs border border-white/10 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
```

### 4.5. Vùng CẤM (trong task này)
- KHÔNG đụng: Logic bên trong `stopAllDownloaderVideosAction`, `clearDownloaderVideosAction`.
- KHÔNG sửa: `confirm()` trong `edit-project-modal.tsx` (dòng 322) và `downloader-settings-client.tsx` (dòng 72) — nằm ngoài scope plan này.
- KHÔNG đổi tên: `handleStopAll`, `handleClearVideos`.

### 4.6. Phụ thuộc
- Không phụ thuộc task nào. Có thể làm song song.

### 4.7. Verification (Cách kiểm tra đúng/sai)
- `grep -n "confirm(" app/app/(dashboard)/hero-downloader/t/\[teamId\]/dashboard/downloader-dashboard-client.tsx` — phải trả về **0 kết quả**.
- `grep -n "confirmModal" app/app/(dashboard)/hero-downloader/t/\[teamId\]/dashboard/downloader-dashboard-client.tsx` — phải có ≥ 6 kết quả (state, 2x setConfirmModal trong handlers, render JSX, close handlers).

### 4.8. Kết quả mong đợi
- Nhấn "Dừng tải tất cả" hoặc "Xóa tất cả video" → hiện Confirm Modal Premium Dark Mode giữa màn hình (backdrop blur + z-[60]).
- Modal có 2 nút: "Hủy" (đóng modal) và "Xác nhận" (thực thi action + đóng modal).
- Click backdrop ngoài modal cũng đóng modal.
- Không còn popup `confirm()` native trình duyệt.

---

## THỨ TỰ THỰC HIỆN

```
Task 1 (API Route + Client body) ──────┐
Task 2 (Loại bỏ reload())  ────────────┤── Tất cả song song, cùng file chính
Task 3 (Inline URL Input) ─────────────┤   nhưng sửa ở vùng code khác nhau
Task 4 (Confirm Modal) ────────────────┘
```

**Khuyến nghị cho Flash**: Thực hiện tuần tự Task 1 → 2 → 3 → 4 vì tất cả đều sửa cùng 1 file chính (`downloader-dashboard-client.tsx`). Tuần tự giúp tránh xung đột dòng số sau mỗi edit.

## SAU KHI HOÀN TẤT
- **Cập nhật START.md**: Thêm mục `✅ Hoàn thành Hotfix & Refactor Hero Downloader: Động hóa model Image AI, loại bỏ window.location.reload(), thay thế prompt()/confirm() native bằng inline UI Premium Dark Mode.` dưới section tiến độ mới nhất.
- **Cập nhật UI_MAP.md**: Không thay đổi navigation/routes → KHÔNG cần cập nhật.
- **Cập nhật LESSONS.md**: Đề xuất thêm lesson mới:
  - **5.x**: Pattern Confirm Modal inline dạng state-driven — dùng `useState<{ isOpen, title, message, onConfirm }>` thay vì component riêng, giữ file phẳng.
  - **4.x**: `window.location.reload()` là anti-pattern trong SPA Next.js — luôn dùng immutable state update (`setX(prev => ...)`) để cập nhật UI sau mutation.
