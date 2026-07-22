# PLAN: Dịch Thumbnail — Hero Downloader (ĐƠN GIẢN)
> Ngày tạo: 2026-07-22
> Tác giả: Gemini (CTO/Architect)
> Số tasks: 4
> Ước tính: ~30 phút cho Flash thực thi

## MỤC TIÊU TỔNG
1. **Hiển thị thumbnail** trong bảng video Dashboard (data đã có sẵn trong DB, chỉ chưa render lên UI)
2. **Dịch thumbnail bằng AI**: Gửi ảnh thumbnail cho Vision AI → đọc text → dịch → gửi Image Gen AI tạo ảnh mới
3. **Chọn ngôn ngữ đích** (Việt, Anh, Hàn, Nhật...)
4. **Chọn AI model** từ Connect Hub (cổng API AI2Hero)

## BỐI CẢNH
- DB `downloader_videos` đã có cột `thumbnail_url` — Extension đã cào `cover_url` từ Douyin/Bilibili
- Server Action `getDownloaderVideosAction` đã trả `thumbnailUrl` — UI chưa render
- Connect Hub (`runConnectorAction`) đã có sẵn: action `chat_completion` (vision) + `generate_image`
- Pattern tham chiếu: `app/api/video-maker/ai/image/route.ts` (image gen qua Connect Hub)

## RÀNG BUỘC TOÀN CỤC
- KHÔNG sửa: runner files, connector-service, engine, extension code
- KHÔNG đổi tên: hàm/biến đang chạy tốt
- Dùng `runConnectorAction` cho MỌI cuộc gọi AI (không gọi trực tiếp API)

---

## TASK 1: Schema + Server Actions

### 1.1. Mô tả
Thêm cột `translated_thumbnail_url` vào DB. Sửa `getDownloaderVideosAction` trả thêm trường mới.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/schema.ts` | MODIFY | ~2 dòng |
| `app/lib/db/hero-downloader-actions.ts` | MODIFY | ~4 dòng |

### 1.3. Code Snapshot tại điểm sửa

**schema.ts dòng 2487-2489:**
```typescript
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'), // seconds
```

**hero-downloader-actions.ts dòng 193-195 (select trong join query):**
```typescript
    thumbnailUrl: downloaderVideos.thumbnailUrl,
    duration: downloaderVideos.duration,
```

### 1.4. Thay đổi cần thực hiện

**schema.ts** — Thêm 1 cột sau `thumbnailUrl`:
```typescript
  thumbnailUrl: text('thumbnail_url'),
  translatedThumbnailUrl: text('translated_thumbnail_url'),  // NEW
  duration: integer('duration'), // seconds
```

**hero-downloader-actions.ts** — Thêm 1 trường vào select:
```typescript
    thumbnailUrl: downloaderVideos.thumbnailUrl,
    translatedThumbnailUrl: downloaderVideos.translatedThumbnailUrl,  // NEW
    duration: downloaderVideos.duration,
```

Sau đó chạy: `cd app && pnpm db:push`

### 1.5. Vùng CẤM
- KHÔNG sửa bảng khác, KHÔNG sửa logic action khác

### 1.6. Phụ thuộc
Không. Làm ĐẦU TIÊN.

### 1.7. Verification
- `pnpm tsc --noEmit` pass
- `pnpm db:push` thành công

### 1.8. Kết quả mong đợi
DB có cột `translated_thumbnail_url`. Server action trả thêm `translatedThumbnailUrl`.

---

## TASK 2: API Route — Dịch Thumbnail qua Connect Hub

### 2.1. Mô tả
Tạo API Route đơn giản nhận `videoId`, `connectionId`, `model`, `targetLang`. Gọi Connect Hub 2 lần:
1. `chat_completion` (vision) — gửi ảnh + prompt yêu cầu đọc text + mô tả bố cục
2. `generate_image` — gửi mô tả + text đã dịch để tạo thumbnail mới

Upload kết quả lên R2, lưu vào DB.

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/api/hero-downloader/thumbnail/route.ts` | NEW | ~150 dòng |

### 2.3. Code Snapshot (Pattern tham chiếu)

**runConnectorAction signature (connector-service.ts dòng 149-167):**
```typescript
export async function runConnectorAction(params: {
  teamId: number;
  connectionId: number;
  actionSlug: string;        // 'chat_completion' | 'generate_image'
  input: Record<string, any>;
  callerModule: string;
}): Promise<{ success: boolean; data?: any; error?: string; }>
```

**Image gen pattern (video-maker/ai/image/route.ts dòng 76-87):**
```typescript
const actionResult = await runConnectorAction({
  teamId: authResult.teamId,
  connectionId,
  actionSlug: 'generate_image',
  input: { model: modelRealName, prompt, resolution, size: resolution },
  callerModule: 'hero-video-maker'
});
```

**R2 upload pattern (video-maker/ai/image/route.ts dòng 105-112):**
```typescript
const buffer = Buffer.from(base64Image, 'base64');
const filename = `toonflow/images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
cloudUrl = await uploadFile(buffer, filename, 'image/png');
```

**Auth pattern — session-based (dùng cho Dashboard web):**
```typescript
import { getTeamForUser, getUserFromSession } from '@/lib/db/queries';
const user = await getUserFromSession();
const teamData = await getTeamForUser(user.id);
```

### 2.4. Thay đổi cần thực hiện
Tạo file `app/app/api/hero-downloader/thumbnail/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTeamForUser, getUserFromSession } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { downloaderVideos, downloaderProjects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadFile } from '@/lib/storage/r2';
import { runConnectorAction } from '@/lib/connect-hub/connector-service';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const user = await getUserFromSession();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const teamData = await getTeamForUser(user.id);
    if (!teamData) return NextResponse.json({ error: 'Không có workspace' }, { status: 403 });
    const teamId = teamData.teamId;

    // 2. Parse body
    const { videoId, connectionId, model, targetLang = 'Tiếng Việt' } = await req.json();
    if (!videoId || !connectionId || !model) {
      return NextResponse.json({ error: 'Thiếu videoId, connectionId hoặc model' }, { status: 400 });
    }

    // 3. Lấy video + verify ownership
    const [video] = await db.select({ id: downloaderVideos.id, thumbnailUrl: downloaderVideos.thumbnailUrl })
      .from(downloaderVideos)
      .innerJoin(downloaderProjects, eq(downloaderVideos.projectId, downloaderProjects.id))
      .where(and(eq(downloaderVideos.id, videoId), eq(downloaderProjects.teamId, teamId)))
      .limit(1);
    if (!video?.thumbnailUrl) return NextResponse.json({ error: 'Video không có thumbnail' }, { status: 400 });

    // 4. Bước 1: Vision AI — đọc text + mô tả layout + dịch
    const visionResult = await runConnectorAction({
      teamId,
      connectionId,
      actionSlug: 'chat_completion',
      input: {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: video.thumbnailUrl } },
            { type: 'text', text: `Phân tích ảnh thumbnail này. Trả về JSON thuần (KHÔNG markdown):
{"originalText":"toàn bộ chữ trên ảnh","translatedText":"dịch sang ${targetLang}","layout":"mô tả bố cục bằng tiếng Anh: vị trí text, màu, font, hình ảnh, tone màu"}` }
          ]
        }],
        temperature: 0.3,
        max_tokens: 500,
      },
      callerModule: 'hero-downloader',
    });

    if (!visionResult.success) return NextResponse.json({ error: 'Vision AI lỗi: ' + visionResult.error }, { status: 500 });

    // Parse response
    let content = visionResult.data?.choices?.[0]?.message?.content 
                || visionResult.data?.data?.choices?.[0]?.message?.content || '';
    if (typeof content !== 'string') content = JSON.stringify(content);
    let clean = content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) clean = match[0];
    
    let analysis;
    try { analysis = JSON.parse(clean); } 
    catch { return NextResponse.json({ error: 'AI trả về không parse được JSON', raw: content }, { status: 500 }); }

    // 5. Bước 2: Image Gen — tạo thumbnail mới
    const imgPrompt = `Create a video thumbnail: ${analysis.layout}. 
ALL text must be in ${targetLang}: "${analysis.translatedText}". 
Bold readable text with outline/shadow. Eye-catching social media style.`;

    const imgResult = await runConnectorAction({
      teamId,
      connectionId, 
      actionSlug: 'generate_image',
      input: { model: 'dall-e-3', prompt: imgPrompt, size: '1792x1024' },
      callerModule: 'hero-downloader',
    });

    if (!imgResult.success) return NextResponse.json({ error: 'Image Gen lỗi: ' + imgResult.error }, { status: 500 });

    const imageUrl = imgResult.data?.data?.[0]?.url || imgResult.data?.url;
    if (!imageUrl) return NextResponse.json({ error: 'AI không trả URL ảnh' }, { status: 500 });

    // 6. Download → Upload R2
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Không tải được ảnh');
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const filename = `hero-downloader/thumbnails/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const cloudUrl = await uploadFile(buffer, filename, 'image/png');

    // 7. Lưu DB
    await db.update(downloaderVideos)
      .set({ translatedThumbnailUrl: cloudUrl, updatedAt: new Date() })
      .where(eq(downloaderVideos.id, videoId));

    return NextResponse.json({ 
      success: true, translatedThumbnailUrl: cloudUrl,
      originalText: analysis.originalText, translatedText: analysis.translatedText 
    });
  } catch (err: any) {
    console.error('[thumbnail-translate]', err);
    return NextResponse.json({ error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
```

### 2.5. Vùng CẤM
- KHÔNG sửa runner files, connector-service, engine

### 2.6. Phụ thuộc
Task 1 (cần cột DB mới).

### 2.7. Verification
- `pnpm tsc --noEmit` pass
- Test manual: POST `/api/hero-downloader/thumbnail` với `{videoId, connectionId, model, targetLang}`

### 2.8. Kết quả mong đợi
API Route nhận videoId + AI config → Vision đọc + dịch → Image Gen tạo mới → upload R2 → lưu DB → trả URL.

---

## TASK 3: UI — Hiển thị Thumbnail + Nút Dịch + Dropdown chọn AI & Ngôn ngữ

### 3.1. Mô tả
Sửa Dashboard UI:
1. Thêm cột **Ảnh bìa** trong bảng video (render `<img>`)
2. Thêm nút **Dịch Thumbnail** cho video completed có thumbnail
3. Thêm dropdown **chọn ngôn ngữ** (Việt, Anh, Hàn, Nhật, Thái)
4. Thêm dropdown **chọn AI** (lấy danh sách Connect Hub connections từ props)
5. Thêm handler gọi API `/api/hero-downloader/thumbnail`

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` | MODIFY | ~150 dòng |
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/page.tsx` | MODIFY | ~10 dòng |

### 3.3. Code Snapshot tại điểm sửa

**page.tsx (Server Component) — cần truyền thêm AI connections list:**
```tsx
// Hiện tại page.tsx pre-fetch projects, videos, cookies
// Cần thêm: fetch Connect Hub connections có capability vision/image
```

**downloader-dashboard-client.tsx dòng 3 (imports):**
```tsx
import { Download, Play, Pause, Loader2, FolderOpen, Settings, Plus, Pencil, Trash2, Cookie, Check, Copy, ChevronDown, ChevronLeft, ChevronRight, AlertCircle, BotMessageSquare } from 'lucide-react';
```

**dòng 14-35 (props + state):**
```tsx
export default function DownloaderDashboardClient({ 
  teamId,
  initialProjects = [],
  initialVideos = [],
  initialCookies = []
}: { 
  teamId: number;
  initialProjects?: any[];
  initialVideos?: any[];
  initialCookies?: any[];
}) {
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [videos, setVideos] = useState<any[]>(initialVideos);
  // ...
  const [currentPage, setCurrentPage] = useState(1);
```

**dòng 438-446 (table header):**
```tsx
<tr className="border-b border-white/5 text-gray-400 text-xs uppercase bg-black/20">
  <th className="py-3 px-4 font-medium w-8">#</th>
  <th className="py-3 px-4 font-medium">Video ID / Tiêu đề</th>
  <th className="py-3 px-4 font-medium">Dung lượng</th>
  <th className="py-3 px-4 font-medium">Ngày tải</th>
  <th className="py-3 px-4 font-medium">Trạng thái</th>
  <th className="py-3 px-4 font-medium text-right">Hành động</th>
</tr>
```

**dòng 450, 457 (colSpan):**
```tsx
<td colSpan={6} ...>
```

**dòng 464-469 (video row cells):**
```tsx
<tr key={video.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
  <td className="py-3 px-4 text-gray-500">{video.id}</td>
  <td className="py-3 px-4">
    <p className="text-gray-200 font-medium truncate max-w-[200px] lg:max-w-md" title={video.title}>{video.title}</p>
    <a href={video.videoUrl} target="_blank" rel="noreferrer" ...>{video.videoUrl}</a>
  </td>
```

**dòng 527-528 (actions cell):**
```tsx
<td className="py-3 px-4 text-right">
  <div className="flex items-center justify-end gap-2">
```

### 3.4. Thay đổi cần thực hiện

**page.tsx** — Thêm fetch Connect Hub connections (vision+image capable) và truyền xuống client:
```tsx
// Thêm import
import { getConnectHubConnectionsAction } from '@/lib/db/connect-hub-actions';

// Trong component, thêm:
const connectionsResult = await getConnectHubConnectionsAction(teamId);
const aiConnections = (connectionsResult.connections || [])
  .filter((c: any) => c.status === 'connected');

// Truyền xuống:
<DownloaderDashboardClient 
  teamId={teamId} 
  initialProjects={...} 
  initialVideos={...}
  initialCookies={...}
  aiConnections={aiConnections}  // NEW
/>
```

**downloader-dashboard-client.tsx:**

1. **Props** — Thêm `aiConnections` vào props interface
2. **Imports** — Thêm `Image, Languages` từ lucide-react
3. **State** — Thêm:
   ```tsx
   const [translatingIds, setTranslatingIds] = useState<Set<number>>(new Set());
   const [selectedLang, setSelectedLang] = useState('Tiếng Việt');
   const [selectedAiConn, setSelectedAiConn] = useState('');  // "connectionId:modelName"
   ```
4. **Languages list** (constant):
   ```tsx
   const LANGUAGES = ['Tiếng Việt', 'English', '한국어', '日本語', 'ภาษาไทย', 'Bahasa Indonesia'];
   ```
5. **Handler**:
   ```tsx
   const handleTranslateThumbnail = async (videoId: number) => {
     if (!selectedAiConn) { alert('Vui lòng chọn AI model'); return; }
     const [connId, model] = selectedAiConn.split(':');
     setTranslatingIds(prev => new Set(prev).add(videoId));
     try {
       const res = await fetch('/api/hero-downloader/thumbnail', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ videoId, connectionId: parseInt(connId), model, targetLang: selectedLang }),
       });
       const data = await res.json();
       if (data.success) {
         setVideos(prev => prev.map(v => v.id === videoId ? { ...v, translatedThumbnailUrl: data.translatedThumbnailUrl } : v));
       } else { alert(data.error); }
     } catch (err: any) { alert(err.message); }
     finally { setTranslatingIds(prev => { const s = new Set(prev); s.delete(videoId); return s; }); }
   };
   ```
6. **Toolbar** — Thêm thanh chọn AI + Ngôn ngữ phía trên bảng video (ngay trước `<div className="border border-white/5 rounded-xl ...">` bảng video):
   ```tsx
   <div className="flex items-center gap-3 mb-3 flex-wrap">
     <div className="flex items-center gap-2">
       <Languages className="w-4 h-4 text-purple-400" />
       <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
         className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5">
         {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
       </select>
     </div>
     <div className="flex items-center gap-2">
       <span className="text-xs text-gray-500">AI:</span>
       <select value={selectedAiConn} onChange={e => setSelectedAiConn(e.target.value)}
         className="bg-white/5 border border-white/10 text-gray-300 text-xs rounded-lg px-3 py-1.5">
         <option value="">-- Chọn AI --</option>
         {aiConnections.map((c: any) => (
           <option key={c.id} value={`${c.id}:${c.defaultModel || 'gpt-4o-mini'}`}>
             {c.appSlug} ({c.defaultModel || 'default'})
           </option>
         ))}
       </select>
     </div>
   </div>
   ```
7. **Table header** — Thêm `<th>Ảnh bìa</th>` sau `#`, tăng colSpan 6→7
8. **Table body** — Thêm thumbnail cell giữa `#` và Title:
   ```tsx
   <td className="py-2 px-4">
     {video.thumbnailUrl ? (
       <div className="relative">
         <img src={video.translatedThumbnailUrl || video.thumbnailUrl} alt=""
           className="w-20 h-[45px] object-cover rounded-md border border-white/10" loading="lazy" />
         {video.translatedThumbnailUrl && (
           <span className="absolute -top-1 -right-1 bg-teal-500 text-[7px] text-white px-1 rounded font-bold">VI</span>
         )}
       </div>
     ) : (
       <div className="w-20 h-[45px] bg-white/5 rounded-md flex items-center justify-center">
         <Image className="w-4 h-4 text-gray-600" />
       </div>
     )}
   </td>
   ```
9. **Actions cell** — Thêm nút dịch (trước các nút status hiện có):
   ```tsx
   {video.thumbnailUrl && video.status === 'completed' && (
     <button onClick={() => handleTranslateThumbnail(video.id)}
       disabled={translatingIds.has(video.id) || !selectedAiConn}
       className="p-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 transition-colors disabled:opacity-40"
       title="Dịch Thumbnail">
       {translatingIds.has(video.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
     </button>
   )}
   ```

### 3.5. Vùng CẤM
- KHÔNG sửa handler hiện có, modal Create/Edit, Worker Guide, Cookie, Pagination

### 3.6. Phụ thuộc
Task 1 + Task 2 phải xong.

### 3.7. Verification
- `pnpm tsc --noEmit` pass
- `pnpm dev` → `/hero-downloader/t/3/dashboard` → thấy cột Ảnh bìa + dropdown AI/Ngôn ngữ + nút Dịch

### 3.8. Kết quả mong đợi
Dashboard hiển thị thumbnail, cho chọn AI + ngôn ngữ, click nút Dịch → spinner → thumbnail mới xuất hiện.

---

## TASK 4: Modal Preview So sánh Thumbnail

### 4.1. Mô tả
Click vào thumbnail → mở Modal so sánh Gốc vs Đã Dịch, có nút dịch/dịch lại.

### 4.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(dashboard)/hero-downloader/t/[teamId]/dashboard/downloader-dashboard-client.tsx` | MODIFY | ~80 dòng |

### 4.3. Code Snapshot
```tsx
// State section (sau translatingIds từ Task 3):
const [selectedAiConn, setSelectedAiConn] = useState('');

// Cuối component JSX:
    </div>
  );
}
```

### 4.4. Thay đổi cần thực hiện

**Thêm state:**
```tsx
const [previewVideo, setPreviewVideo] = useState<any>(null);
```

**Thumbnail cell từ Task 3 — thêm onClick:**
```tsx
<div className="relative cursor-pointer" onClick={() => setPreviewVideo(video)}>
```

**Thêm Modal trước closing `</div>` cuối:**
```tsx
{previewVideo && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewVideo(null)}>
    <div className="bg-gray-900/95 border border-white/10 rounded-2xl p-6 max-w-3xl w-full mx-4" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-100">Xem Thumbnail</h3>
        <button onClick={() => setPreviewVideo(null)} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <p className="text-sm text-gray-400 mb-4 truncate">{previewVideo.title}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase mb-2">Ảnh gốc</p>
          {previewVideo.thumbnailUrl 
            ? <img src={previewVideo.thumbnailUrl} alt="" className="w-full rounded-lg border border-white/10" />
            : <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center text-gray-600">Không có</div>}
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase mb-2">Ảnh đã dịch</p>
          {previewVideo.translatedThumbnailUrl
            ? <img src={previewVideo.translatedThumbnailUrl} alt="" className="w-full rounded-lg border border-teal-500/30" />
            : <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center text-gray-600">Chưa dịch</div>}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={() => { handleTranslateThumbnail(previewVideo.id); setPreviewVideo(null); }}
          disabled={translatingIds.has(previewVideo.id) || !selectedAiConn}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl border border-purple-500/30 text-sm disabled:opacity-40">
          {previewVideo.translatedThumbnailUrl ? 'Dịch lại' : 'Dịch & Redesign'}
        </button>
        <button onClick={() => setPreviewVideo(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 text-sm">Đóng</button>
      </div>
    </div>
  </div>
)}
```

### 4.5. Vùng CẤM
- KHÔNG sửa các modal khác, handler khác

### 4.6. Phụ thuộc
Task 3 phải xong.

### 4.7. Verification
- Click thumbnail → Modal mở, hiển thị 2 cột so sánh
- Nút Dịch → đóng modal → spinner ở bảng

### 4.8. Kết quả mong đợi
Modal preview Glassmorphism so sánh trước/sau.

---

## THỨ TỰ THỰC HIỆN
```
Task 1 (Schema + Actions) → Task 2 (API Route) → Task 3 (UI chính) → Task 4 (Modal)
```

## SAU KHI HOÀN TẤT
- START.md: `[x] Tích hợp Dịch Thumbnail AI + chọn ngôn ngữ/model trên Dashboard`
- UI_MAP.md: Thêm ghi chú Dashboard có Thumbnail + Dịch AI
