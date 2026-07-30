# PLAN: Tách nhỏ Component UI cho Hero Dub Dashboard
> Ngày tạo: 2026-07-30
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 5
> Ước tính: ~60 phút cho Flash thực thi

## MỤC TIÊU TỔNG
1. **Tách file `dashboard-client.tsx` (2.072 dòng)** thành các sub-components có ranh giới rõ ràng, giảm kích thước file chính xuống ~500 dòng.
2. **Gộp các hàm helper dùng chung** (`getStatusBadge`, `getPlatformLabel`) giữa `dashboard-client.tsx` và `history-client.tsx` thành 1 file shared duy nhất — loại bỏ code trùng lặp.
3. **Không thay đổi hành vi, giao diện, hay data flow** — 100% refactor cấu trúc, không thêm tính năng mới.

## BỐI CẢNH KIẾN TRÚC

### File hiện tại (TRƯỚC khi tách):
```
hero-dub/t/[teamId]/
├── dashboard/
│   ├── page.tsx                    (93 dòng — Server Component, fetch data)
│   └── dashboard-client.tsx        (2.072 dòng — ❌ KHỔNG LỒ, chứa TẤT CẢ)
├── history/
│   ├── page.tsx                    (368 bytes)
│   └── history-client.tsx          (431 dòng — CŨNG chứa getStatusBadge, getPlatformLabel riêng)
├── projects/
│   ├── page.tsx                    (1.121 bytes)
│   └── projects-client.tsx         (431 dòng)
└── layout.tsx
```

### Cấu trúc ĐỀ XUẤT (SAU khi tách):
```
hero-dub/t/[teamId]/
├── dashboard/
│   ├── page.tsx                    (93 dòng — KHÔNG SỬA)
│   ├── dashboard-client.tsx        (~500 dòng — chỉ còn state, handlers, layout grid)
│   ├── dub-task-form.tsx           (~420 dòng — NEW: form tạo/sửa tác vụ, Dự án quét)
│   ├── dub-task-table.tsx          (~250 dòng — NEW: bảng hàng đợi + phân trang)
│   ├── dub-worker-panel.tsx        (~100 dòng — NEW: Worker status bar + danh sách worker)
│   └── dub-guide-panel.tsx         (~120 dòng — NEW: hướng dẫn cài đặt worker)
├── _shared/
│   └── dub-ui-helpers.tsx          (~80 dòng — NEW: getStatusBadge, getPlatformLabel, formatTime)
├── history/
│   ├── page.tsx                    (KHÔNG SỬA)
│   └── history-client.tsx          (SỬA: import shared helpers thay vì tự define)
├── projects/ (KHÔNG SỬA)
└── layout.tsx (KHÔNG SỬA)
```

### Nguyên tắc tách:
- **Tách theo vùng giao diện**, không tách theo logic nghiệp vụ.
- Mỗi sub-component nhận props từ `dashboard-client.tsx` — không truy cập Server Actions trực tiếp.
- State vẫn tập trung tại `dashboard-client.tsx` (nguồn sự thật), sub-components chỉ nhận callback handlers.
- **Kiến trúc phẳng** — import 1 cấp, không nested components.

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: `page.tsx` (cả dashboard, history, projects), `layout.tsx`, `hero-dub-sidebar-menu.tsx`, `hero-dub-actions.ts`, `hero-dub-scan-actions.ts`, Python Worker, API routes.
- KHÔNG đổi tên: bất kỳ hàm/biến/state nào đang tồn tại trong `dashboard-client.tsx`. Giữ nguyên 100% tên: `handleCreateTask`, `handleRetryTask`, `handleDeleteTask`, `handleEditTask`, `handleScanNow`, `handleToggleActive`, `handleSaveScanProject`, `handleDeleteScanProject`, `handleEditScanProject`, `handleGenerateCode`, `handleCopyCode`, `handleOpenLocal`, `handleLocalFileUpload`, `handlePreviewVoice`, `handleTtsEngineChange`, `refreshData`, `showToast`.
- KHÔNG thay đổi: CSS Design System (Obsidian Glassmorphism), import paths khác ngoài vùng hero-dub, Smart Polling logic.
- CSS conventions: Dark Mode (`bg-gray-950`, `bg-gray-900/40`, `border-white/5`, `text-gray-400`), Amber/Orange accent.
- Data: `dashboard-client.tsx` state = nguồn sự thật giao diện. DB via Server Actions = nguồn sự thật data.

## LESSONS CẦN NHỚ
- **1.1**: Sửa 1 file → test → mới qua file tiếp.
- **1.2**: KHÔNG đổi tên biến/hàm đang chạy tốt.
- **1.5**: Khi tách code sang file mới, dọn sạch code cũ ở file gốc.
- **3.8**: z-index collision — modal phải > z-50.
- **5**: Tìm code CÓ SẴN trước khi viết mới. Dùng lại component/style đã kiểm chứng.

---

## TASK 1: Tạo file shared helpers (`_shared/dub-ui-helpers.tsx`)

### 1.1. Mô tả
Gom 3 hàm helper đang bị duplicate giữa `dashboard-client.tsx` (dòng 824-876) và `history-client.tsx` vào 1 file shared duy nhất. File này export các pure functions, không phụ thuộc state.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `hero-dub/t/[teamId]/_shared/dub-ui-helpers.tsx` | NEW | ~80 dòng |

### 1.3. Code Snapshot tại điểm sửa
Từ `dashboard-client.tsx` dòng 824-876 (copy nguyên):
```typescript
const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
```
```typescript
const getStatusBadge = (status: string) => { ... }; // dòng 845-868
const getPlatformLabel = (platform: string, sourceUrl: string = '') => { ... }; // dòng 870-876
```

### 1.4. Thay đổi cần thực hiện
Tạo file mới `_shared/dub-ui-helpers.tsx`:
```typescript
'use client';
import { CheckCircle, Clock, Loader2, AlertTriangle, FolderOpen } from 'lucide-react';

export function formatTime(seconds: number) { /* copy nguyên từ dashboard-client.tsx dòng 824-828 */ }
export function getStatusBadge(status: string) { /* copy nguyên từ dashboard-client.tsx dòng 845-868 */ }
export function getPlatformLabel(platform: string, sourceUrl: string = '') { /* copy nguyên từ dashboard-client.tsx dòng 870-876 */ }
```
- `'use client'` directive bắt buộc vì các hàm trả về JSX element.
- Import đúng các icon Lucide đang dùng: `CheckCircle`, `Clock`, `Loader2`, `AlertTriangle`, `FolderOpen`.

### 1.5. Vùng CẤM (trong task này)
- KHÔNG sửa `dashboard-client.tsx` hay `history-client.tsx` ở task này (sẽ sửa ở Task 2 & 5).

### 1.6. Phụ thuộc
Không phụ thuộc task nào. Có thể làm đầu tiên.

### 1.7. Verification (Cách kiểm tra đúng/sai)
- File mới tạo phải compile thành công: `npx tsc --noEmit hero-dub/t/[teamId]/_shared/dub-ui-helpers.tsx` (hoặc toàn bộ `tsc`).
- JSX return của mỗi hàm phải y hệt code gốc (pixel-perfect).

### 1.8. Kết quả mong đợi
- File `_shared/dub-ui-helpers.tsx` tồn tại, export 3 hàm: `formatTime`, `getStatusBadge`, `getPlatformLabel`.

---

## TASK 2: Tạo `dub-guide-panel.tsx` và `dub-worker-panel.tsx`

### 2.1. Mô tả
Tách 2 vùng giao diện độc lập ra khỏi `dashboard-client.tsx`:
1. **Guide Panel** (dòng 947-1022): Hướng dẫn cài đặt Worker (Windows/Mac toggle, lệnh curl, bước 1-2).
2. **Worker Panel** (dòng 1024-1062 + 1950-1991): Thanh trạng thái Worker + Danh sách máy xử lý kết nối.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `hero-dub/t/[teamId]/dashboard/dub-guide-panel.tsx` | NEW | ~120 dòng |
| `hero-dub/t/[teamId]/dashboard/dub-worker-panel.tsx` | NEW | ~100 dòng |

### 2.3. Code Snapshot tại điểm sửa

**Guide Panel — Props interface:**
```typescript
interface DubGuidePanelProps {
  showGuide: boolean;
  guideOs: 'windows' | 'macos';
  setGuideOs: (os: 'windows' | 'macos') => void;
  guideCopied: boolean;
  handleToggleGuide: () => void;
  handleCopyGuideCommand: () => void;
}
```

**Worker Panel — Props interface:**
```typescript
interface DubWorkerPanelProps {
  workers: any[];
  isWorkerOnline: boolean;
  activeWorker: any;
  handleDeleteWorker: (id: number) => void;
}
```

### 2.4. Thay đổi cần thực hiện

**`dub-guide-panel.tsx`**: Copy nguyên JSX từ `dashboard-client.tsx` dòng 947-1022 (block `{showGuide && (...)}`). Component nhận props thay vì dùng state nội bộ. Giữ nguyên const `winCmd`, `macCmd` bên trong component.

**`dub-worker-panel.tsx`**: 
- Copy JSX Worker Status Bar từ dòng 1024-1062.
- Copy JSX Worker Management Grid từ dòng 1950-1991.
- Gộp thành 1 component nhận props `workers`, `isWorkerOnline`, `activeWorker`, `handleDeleteWorker`.
- Import icon `Laptop`, `AlertTriangle`, `X` từ lucide-react.

### 2.5. Vùng CẤM (trong task này)
- KHÔNG sửa `dashboard-client.tsx` (sẽ sửa ở Task 4).
- KHÔNG sửa CSS class names.

### 2.6. Phụ thuộc
Không phụ thuộc task nào. Có thể làm song song với Task 1 và Task 3.

### 2.7. Verification
- Cả 2 file phải compile thành công (tsc --noEmit).
- JSX output y hệt code gốc.

### 2.8. Kết quả mong đợi
- 2 file mới tồn tại, mỗi file export 1 default component.

---

## TASK 3: Tạo `dub-task-form.tsx` và `dub-task-table.tsx`

### 3.1. Mô tả
Tách 2 vùng giao diện lớn nhất:
1. **Task Form** (dòng 1067-1693): Form tạo tác vụ bên trái — toàn bộ khối `<div className="lg:col-span-1">` bao gồm: Mode toggle (File/Folder), Source input, Language pickers, STT presets, Noise levels, AI Connector, TTS, Branding, Output folder, Submit button.
2. **Task Table** (dòng 1695-1947): Bảng hàng đợi bên phải — toàn bộ khối `<div className="lg:col-span-2">` bao gồm: Table header, Task rows, Pagination.

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `hero-dub/t/[teamId]/dashboard/dub-task-form.tsx` | NEW | ~420 dòng |
| `hero-dub/t/[teamId]/dashboard/dub-task-table.tsx` | NEW | ~250 dòng |

### 3.3. Code Snapshot tại điểm sửa

**Task Form — Props interface (quan trọng nhất, phải đủ):**
```typescript
interface DubTaskFormProps {
  // Mode & editing
  uploadMode: 'file' | 'folder';
  setUploadMode: (mode: 'file' | 'folder') => void;
  editingTaskId: number | null;
  setEditingTaskId: (id: number | null) => void;
  editingProjectId: string | null;
  setEditingProjectId: (id: string | null) => void;
  
  // File input
  localFilePaths: string;
  setLocalFilePaths: (paths: string) => void;
  isUploadingFile: boolean;
  handleLocalFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Task config
  taskTitle: string;
  setTaskTitle: (title: string) => void;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  asrEngine: string;
  setAsrEngine: (engine: string) => void;
  sttPreset: 'fast' | 'balanced' | 'quality';
  setSttPreset: (p: 'fast' | 'balanced' | 'quality') => void;
  noiseLevel: 'clean' | 'normal' | 'noisy';
  setNoiseLevel: (l: 'clean' | 'normal' | 'noisy') => void;
  subtitleMode: string;
  setSubtitleMode: (mode: string) => void;
  
  // AI Connector
  selectedAiAppSlug: string;
  setSelectedAiAppSlug: (slug: string) => void;
  selectedAiModel: string;
  setSelectedAiModel: (model: string) => void;
  connectedAiApps?: { slug: string; name: string; models: any[] }[];
  connectedAiTtsApps?: { slug: string; name: string; voices: string[] }[];
  
  // TTS
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  ttsEngine: string;
  handleTtsEngineChange: (engine: string) => void;
  ttsVoice: string;
  setTtsVoice: (voice: string) => void;
  ttsSpeed: string;
  setTtsSpeed: (speed: string) => void;
  bgVolume: string;
  setBgVolume: (vol: string) => void;
  ttsVolume: string;
  setTtsVolume: (vol: string) => void;
  handlePreviewVoice: () => void;
  
  // Branding
  brandingEnabled: boolean;
  setBrandingEnabled: (enabled: boolean) => void;
  selectedProjectId: number | '';
  setSelectedProjectId: (id: number | '') => void;
  projects: any[];
  
  // Output & Submit
  outputFolder: string;
  setOutputFolder: (folder: string) => void;
  creatingTask: boolean;
  uploadProgressMsg: string;
  handleCreateTask: (e: React.FormEvent) => void;
  
  // Scan Projects
  scanProjects: any[];
  scanFolderPath: string;
  setScanFolderPath: (path: string) => void;
  scanInterval: number;
  setScanInterval: (interval: number) => void;
  handleSaveScanProject: () => void;
  handleScanNow: (config: any) => void;
  handleToggleActive: (config: any) => void;
  handleEditScanProject: (project: any) => void;
  handleDeleteScanProject: (id: string) => void;
  
  // Navigation
  teamId: number;
}
```

**Task Table — Props interface:**
```typescript
interface DubTaskTableProps {
  tasks: any[];
  loading: boolean;
  taskPage: number;
  setTaskPage: (page: number) => void;
  taskTotalCount: number;
  tasksPerPage: number;
  refreshData: (showLoading?: boolean, page?: number) => void;
  handleRetryTask: (taskId: number) => void;
  handleDeleteTask: (taskId: number) => void;
  handleEditTask: (task: any) => void;
  handleOpenLocal: (path: string, isFolder?: boolean) => void;
  setPreviewVideoUrl: (url: string | null) => void;
  setPreviewSrtUrl: (url: string | null) => void;
  teamId: number;
}
```

### 3.4. Thay đổi cần thực hiện

**`dub-task-form.tsx`**:
- Copy toàn bộ JSX từ `dashboard-client.tsx` dòng 1067-1693 (block `<div className="lg:col-span-1">`).
- Thay mọi state access bằng props (VD: `sourceLang` → `props.sourceLang`; hoặc destructure props).
- Import `Link` từ `next/link`, các icon Lucide cần dùng.
- Import `showToast` từ `sim-ui-helpers` (để dùng trong `handleCopyGuideCommand` nếu inline).

**`dub-task-table.tsx`**:
- Copy toàn bộ JSX từ `dashboard-client.tsx` dòng 1695-1947 (block `<div className="lg:col-span-2">`).
- Import `getStatusBadge`, `getPlatformLabel` từ `../_shared/dub-ui-helpers`.
- Import `showToast` từ `sim-ui-helpers`.
- Import các icon Lucide: `Video`, `Loader2`, `ExternalLink`, `RefreshCw`, `RotateCcw`, `Trash2`, `Folder`, `Edit`, `Download`, `CheckCircle`, `FolderOpen`.

### 3.5. Vùng CẤM (trong task này)
- KHÔNG sửa `dashboard-client.tsx` (sẽ sửa ở Task 4).
- KHÔNG đổi tên props hay callback names — phải trùng khớp 100% với tên state/handler ở file gốc.
- KHÔNG thay đổi CSS class.

### 3.6. Phụ thuộc
- Phụ thuộc **Task 1** (cần import `getStatusBadge`, `getPlatformLabel` từ `_shared/dub-ui-helpers.tsx` cho `dub-task-table.tsx`).
- Có thể làm song song với Task 2.

### 3.7. Verification
- Cả 2 file compile thành công (tsc --noEmit).
- Props interface đủ mọi data/handler cần thiết.
- Không thiếu import nào.

### 3.8. Kết quả mong đợi
- 2 file mới tồn tại, mỗi file export 1 default component.

---

## TASK 4: Refactor `dashboard-client.tsx` — thay thế inline code bằng sub-components

### 4.1. Mô tả
Đây là task quan trọng nhất. Sửa file `dashboard-client.tsx` gốc:
- Xóa toàn bộ inline JSX đã tách ra Task 1, 2, 3 (Guide Panel, Worker Status, Worker Grid, Task Form, Task Table).
- Thay bằng import và render các sub-components mới.
- Xóa 3 hàm helper đã chuyển sang `_shared/dub-ui-helpers.tsx` (`getStatusBadge`, `getPlatformLabel`, `formatTime`).
- Import `formatTime` từ shared helpers (vẫn cần cho Pairing Countdown).
- Giữ nguyên 100% state declarations, useEffect hooks, callback handlers, Smart Polling logic, Video Player Modal, Footer.

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `hero-dub/t/[teamId]/dashboard/dashboard-client.tsx` | MODIFY | Xóa ~1.500 dòng, thêm ~50 dòng import/render |

### 4.3. Code Snapshot tại điểm sửa

**Đầu file — thêm imports (sau dòng 54):**
```typescript
import { formatTime, getStatusBadge, getPlatformLabel } from '../_shared/dub-ui-helpers';
import DubGuidePanel from './dub-guide-panel';
import DubWorkerPanel from './dub-worker-panel';
import DubTaskForm from './dub-task-form';
import DubTaskTable from './dub-task-table';
```

**Trong return JSX — thay thế vùng Guide (dòng 947-1022):**
```tsx
{/* Trước: 75 dòng inline JSX */}
{/* Sau: */}
{showGuide && (
  <DubGuidePanel
    showGuide={showGuide}
    guideOs={guideOs}
    setGuideOs={setGuideOs}
    guideCopied={guideCopied}
    handleToggleGuide={handleToggleGuide}
    handleCopyGuideCommand={handleCopyGuideCommand}
  />
)}
```

**Thay thế Worker Status Bar (dòng 1024-1062):**
```tsx
<DubWorkerPanel
  workers={workers}
  isWorkerOnline={isWorkerOnline}
  activeWorker={activeWorker}
  handleDeleteWorker={handleDeleteWorker}
  section="status"
/>
```

**Thay thế Main Grid (dòng 1064-1948):**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <DubTaskForm {...taskFormProps} />
  <DubTaskTable {...taskTableProps} />
</div>
```

**Thay thế Worker Management Grid (dòng 1950-1991):**
```tsx
<DubWorkerPanel
  workers={workers}
  isWorkerOnline={isWorkerOnline}
  activeWorker={activeWorker}
  handleDeleteWorker={handleDeleteWorker}
  section="management"
/>
```

**XÓA 3 hàm helper (dòng 824-876):**
```typescript
// XÓA: const formatTime = ...
// XÓA: const getStatusBadge = ...
// XÓA: const getPlatformLabel = ...
```

### 4.4. Thay đổi cần thực hiện
1. Thêm 5 dòng import ở đầu file.
2. Xóa 3 hàm helper (dòng 824-876) — đã chuyển sang `_shared/dub-ui-helpers.tsx`.
3. Xóa inline JSX Guide Panel (dòng 947-1022), thay bằng `<DubGuidePanel ... />`.
4. Xóa inline JSX Worker Status (dòng 1024-1062), thay bằng `<DubWorkerPanel section="status" ... />`.
5. Xóa inline JSX Task Form (dòng 1067-1693), thay bằng `<DubTaskForm ... />`.
6. Xóa inline JSX Task Table (dòng 1695-1947), thay bằng `<DubTaskTable ... />`.
7. Xóa inline JSX Worker Grid (dòng 1950-1991), thay bằng `<DubWorkerPanel section="management" ... />`.
8. GIỮ NGUYÊN: Header section (dòng 881-945), PollingBanner, Video Player Modal (dòng 1993-2046), Footer (dòng 2048-2068).
9. GIỮ NGUYÊN: Tất cả useState, useEffect, useCallback, Smart Polling, Pairing Countdown.
10. Xóa các import Lucide icon không còn dùng trực tiếp trong file gốc (giữ lại `Key`, `Copy`, `Check`, `Loader2`, `X`, `Download` — vẫn dùng cho Header và Video Modal).

### 4.5. Vùng CẤM (trong task này)
- KHÔNG đổi tên bất kỳ state variable hay handler nào.
- KHÔNG sửa `page.tsx`.
- KHÔNG thay đổi logic bên trong handlers.
- KHÔNG xóa Video Player Modal hoặc Footer.

### 4.6. Phụ thuộc
- Phụ thuộc **Task 1** (shared helpers), **Task 2** (guide + worker panels), **Task 3** (form + table).
- Phải làm SAU Task 1, 2, 3.

### 4.7. Verification
- `tsc --noEmit` pass 100% trên toàn bộ project.
- Không có import nào dangling (file không tồn tại).
- File giảm từ ~2.072 dòng xuống ~500 dòng.
- `pnpm dev` → mở `/hero-dub/t/3/dashboard` → giao diện y hệt trước refactor.

### 4.8. Kết quả mong đợi
- `dashboard-client.tsx` ≤ 550 dòng.
- Giao diện và hành vi 100% không đổi.
- Không còn inline JSX lớn (>50 dòng liên tục) trong file gốc.

---

## TASK 5: Refactor `history-client.tsx` — import shared helpers

### 5.1. Mô tả
Sửa `history-client.tsx` để import `getStatusBadge` và `getPlatformLabel` từ file shared helpers (`_shared/dub-ui-helpers.tsx`) thay vì tự khai báo nội bộ. Xóa code trùng lặp.

### 5.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `hero-dub/t/[teamId]/history/history-client.tsx` | MODIFY | Xóa ~50 dòng trùng, thêm 1 dòng import |

### 5.3. Code Snapshot tại điểm sửa
Cần tìm chính xác vị trí khai báo `getStatusBadge` và `getPlatformLabel` trong `history-client.tsx` (AI Flash cần grep) rồi xóa, thay bằng:
```typescript
import { getStatusBadge, getPlatformLabel } from '../_shared/dub-ui-helpers';
```

### 5.4. Thay đổi cần thực hiện
1. Thêm import `{ getStatusBadge, getPlatformLabel }` từ `../_shared/dub-ui-helpers`.
2. Xóa khai báo nội bộ `getStatusBadge` và `getPlatformLabel` (khoảng ~50 dòng).
3. Xóa các import Lucide icon liên quan nếu không dùng ở chỗ khác trong file (cần kiểm tra trước khi xóa).

### 5.5. Vùng CẤM (trong task này)
- KHÔNG sửa logic hiển thị lịch sử, filter, phân trang.
- KHÔNG đổi tên component `HistoryClient`.

### 5.6. Phụ thuộc
- Phụ thuộc **Task 1** (file shared helpers phải tồn tại trước).
- Có thể làm song song với Task 4.

### 5.7. Verification
- `tsc --noEmit` pass.
- Mở `/hero-dub/t/3/history` → badge hiển thị y hệt.

### 5.8. Kết quả mong đợi
- `history-client.tsx` giảm ~50 dòng.
- Không còn code trùng lặp giữa `history-client.tsx` và `_shared/dub-ui-helpers.tsx`.

---

## THỨ TỰ THỰC HIỆN

```
Task 1 (shared helpers) ─────────────────┐
                                          ├─→ Task 4 (refactor dashboard-client.tsx)
Task 2 (guide + worker panels) ──────────┤
                                          │
Task 3 (task form + task table) ─────────┘
                                          
Task 1 ───────────────────────────────────→ Task 5 (refactor history-client.tsx)
```

- **Task 1, 2, 3**: Có thể làm song song (tạo file mới, không sửa file cũ).
- **Task 4**: Phải làm SAU Task 1+2+3 (sửa file gốc, import sub-components).
- **Task 5**: Phải làm SAU Task 1 (import shared helpers). Có thể song song với Task 4.

## SAU KHI HOÀN TẤT
- Cập nhật **START.md**: Thêm entry mới trong `CÔNG VIỆC HIỆN TẠI ĐANG THỰC HIỆN`: `2026-07-30 (hero-dub - Refactor UI Components): Tách dashboard-client.tsx (2.072 dòng) thành 6 sub-components...`
- Cập nhật **UI_MAP.md**: Thêm ghi chú cấu trúc file mới trong phần Hero Dub.
- **KHÔNG CẦN** cập nhật LESSONS.md (refactor tiêu chuẩn, không phát hiện pattern mới).
