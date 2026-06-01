# PLAN_HEROVIDEO_FIX - Xu ly loi bao mat va sync HeroVideo
> Ngay tao: 2026-06-01
> Tac gia: Claude Opus (CTO/Architect)
> So tasks: 4
> Uoc tinh: 45-60 phut cho Flash thuc thi
> Nguon: Audit MVP HeroVideo Download va Extension ngay 2026-06-01

## MUC TIEU TONG
Sua cac loi uu tien cao cua MVP HeroVideo truoc khi toi uu them tinh nang: ngan ro ri Bearer token tu extension sang page, chuan hoa luong sync video, validate API backend, va lam dung hanh vi ket noi/mo thu muc workspace.

## BOI CANH KIEN TRUC
- HeroVideo gom 3 phan: Chrome Extension `app/extension/herovideo`, API sync `app/app/api/video/extension/sync/route.ts`, dashboard web `app/app/(dashboard)/herovideodownload/dashboard`.
- Luong hien tai: popup login vao `https://www.ai2hero.com/api/sim/extension/auth` -> luu `herovideo_token` trong `chrome.storage.local` -> download file vao `HeroVideo/[workspaceSlug]` -> POST metadata len `/api/video/extension/sync`.
- Dashboard web dung `window.postMessage` de kiem tra extension va dung File System Access API de doc file local.
- Bang du lieu backend: `video_assets` trong `app/lib/db/schema.ts`, cac truong chinh gom `teamId`, `userId`, `title`, `url`, `size`, `mimeType`, `thumbnailUrl`, `status`.

## RANG BUOC TOAN CUC (Global Constraints)
- KHONG sua core Cat-Catch parser: `m3u8.js`, `m3u8.downloader.js`, `mpd.js`, `downloader.js` tru khi task chi dinh ro.
- KHONG doi ten cac message public dang dung: `HERO_VIDEO_EXT_CHECK`, `HERO_VIDEO_EXT_PING`, `HERO_VIDEO_OPEN_FOLDER`.
- KHONG doi schema database trong plan nay.
- KHONG doi endpoint public: `/api/video/extension/sync`, `/api/sim/extension/auth`, `/api/sim/extension/auth/select-workspace`.
- Giu phong cach UI hien co cua module HeroVideo dashboard, khong lam redesign.

## LESSONS CAN NHO
- 1.2: Khong doi ten bien/ham dang chay tot neu khong bat buoc.
- 10.5: Khong tin cam giac code dung; phai grep, build, va verify luong that.
- Security First trong START.md: khong ro ri token/API key ra Client/page context.

---

## TASK 1: Chan ro ri token qua window.postMessage

### 1.1. Mo ta
`content-script.js` dang doc `herovideo_token` tu `chrome.storage.local` va day token ra page bang `window.postMessage(..., '*')`. Bat ky script nao tren trang hien tai cung co the nghe `HERO_VIDEO_EXT_PING` va lay token. Task nay sua protocol ping de chi tra ve trang thai dang nhap, `teamId`, va `hasAuth`, khong bao gio gui token ra page context.

### 1.2. Files can sua
| File | Hanh dong | Dong uoc tinh |
|---|---|---|
| `app/extension/herovideo/js/content-script.js` | MODIFY | ~25 dong |
| `app/app/(dashboard)/herovideodownload/dashboard/extension-status.tsx` | MODIFY | ~15 dong |

### 1.3. Code Snapshot tai diem sua
`content-script.js` hien tai:
```javascript
            chrome.storage.local.get(['herovideo_token', 'herovideo_workspace'], function(result) {
                window.postMessage({ 
                    type: 'HERO_VIDEO_EXT_PING', 
                    token: result.herovideo_token,
                    teamId: result.herovideo_workspace
                }, '*');
            });
```

`extension-status.tsx` hien tai:
```typescript
      if (event.data && event.data.type === 'HERO_VIDEO_EXT_PING') {
        clearTimeout(timeoutId);
        const { token, teamId: extTeamId } = event.data;
        if (!token) {
           setStatus('not_logged_in');
        } else if (teamId && extTeamId && extTeamId != teamId) {
           setStatus('wrong_team');
        } else {
           setStatus('connected');
        }
      }
```

### 1.4. Thay doi can thuc hien
Trong `content-script.js`:
- Them helper `isAllowedAi2HeroOrigin(origin)` chi cho phep cac origin:
  - `https://www.ai2hero.com`
  - `https://ai2hero.com`
  - `http://localhost:3000`
- Khi nhan `HERO_VIDEO_EXT_CHECK`, neu origin khong hop le thi return.
- Chi post message ve window voi payload:
```javascript
{
  type: 'HERO_VIDEO_EXT_PING',
  hasAuth: Boolean(result.herovideo_token),
  teamId: result.herovideo_workspace || null
}
```
- Khong gui `token`, `email`, hoac bat ky secret nao qua `window.postMessage`.
- Doi targetOrigin tu `'*'` sang `event.origin`.

Trong `extension-status.tsx`:
- Doi destructuring tu `{ token, teamId: extTeamId }` sang `{ hasAuth, teamId: extTeamId }`.
- Doi dieu kien `if (!token)` thanh `if (!hasAuth)`.
- Giu nguyen status `not_installed`, `not_logged_in`, `wrong_team`, `connected`.

### 1.5. Vung CAM (trong task nay)
- Khong sua logic login trong `ai2hero-auth.js`.
- Khong doi ten message `HERO_VIDEO_EXT_CHECK` va `HERO_VIDEO_EXT_PING`.
- Khong bo tinh nang set `herovideo_subfolder` khi dashboard gui `workspaceSlug`.

### 1.6. Phu thuoc
Lam dau tien. Cac task sau duoc phep dua vao viec token khong con bi expose ra page.

### 1.7. Verification (Cach kiem tra dung/sai)
- Chay `rg -n "token:" app/extension/herovideo/js/content-script.js "app/app/(dashboard)/herovideodownload/dashboard/extension-status.tsx"` va dam bao khong con payload `token`.
- Chay `rg -n "HERO_VIDEO_EXT_PING" app/extension/herovideo/js/content-script.js "app/app/(dashboard)/herovideodownload/dashboard/extension-status.tsx"` de kiem tra payload dung `hasAuth`.
- Build app bang `pnpm build` trong `app/`.

### 1.8. Ket qua mong doi
Dashboard van nhan dien duoc extension, van bao sai workspace neu `teamId` khong khop, nhung page khong con doc duoc Bearer token cua extension.

---

## TASK 2: Chuan hoa helper sync video trong popup extension

### 2.1. Mo ta
`popup.js` hien co 2 doan POST sync rieng cho single download va batch download, cung hardcode URL va khong check response. Task nay tao helper nho trong `popup.js` de tai su dung, validate payload toi thieu, va chi hien success khi API tra `ok`.

### 2.2. Files can sua
| File | Hanh dong | Dong uoc tinh |
|---|---|---|
| `app/extension/herovideo/js/popup.js` | MODIFY | ~80 dong |

### 2.3. Code Snapshot tai diem sua
Single download hien tai:
```javascript
            if (res.herovideo_token) {
                const payload = [{
                    title: data.downFileName,
                    url: data.url,
                    size: data.size ? data.size.toString() : "",
                    mimeType: data.ext || "video/mp4",
                    thumbnailUrl: null
                }];
                fetch("https://www.ai2hero.com/api/video/extension/sync", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + res.herovideo_token
                    },
                    body: JSON.stringify({ videos: payload })
                }).catch(e => console.error("Lá»—i Ä‘á»“ng bá»™ AI2Hero", e));
            }
```

Batch download hien tai:
```javascript
    chrome.storage.local.get(['herovideo_token'], async function(result) {
        if (!result.herovideo_token) return;
        const payload = checkedData.map(d => ({
            title: d.downFileName,
            url: d.url,
            size: d.size ? d.size.toString() : "",
            mimeType: d.ext || "video/mp4",
            thumbnailUrl: null
        }));
        try {
            await fetch("https://www.ai2hero.com/api/video/extension/sync", {
```

### 2.4. Thay doi can thuc hien
- Them hang so o dau `popup.js`, gan gan khu vuc khai bao bien:
```javascript
const AI2HERO_API_BASE = "https://www.ai2hero.com";
```
- Them helper:
```javascript
function toHeroVideoPayload(items) {
    return items
        .filter(item => item && item.url)
        .map(item => ({
            title: item.downFileName || item.name || "Video khong ten",
            url: item.url,
            size: item.size ? item.size.toString() : "",
            mimeType: item.type || item.ext || "video/mp4",
            thumbnailUrl: null
        }));
}

async function syncHeroVideosToCloud(items, options = {}) {
    const videos = toHeroVideoPayload(Array.isArray(items) ? items : [items]);
    if (!videos.length) return { success: false, skipped: true };

    return new Promise((resolve) => {
        chrome.storage.local.get(['herovideo_token'], async function(result) {
            if (!result.herovideo_token) {
                resolve({ success: false, skipped: true });
                return;
            }
            try {
                const response = await fetch(`${AI2HERO_API_BASE}/api/video/extension/sync`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + result.herovideo_token
                    },
                    body: JSON.stringify({ videos })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    throw new Error(data.error || "HeroVideo sync failed");
                }
                resolve({ success: true, synced: data.synced || videos.length });
            } catch (e) {
                console.error("Loi dong bo AI2Hero", e);
                resolve({ success: false, error: e });
            }
        });
    });
}
```
- Thay block fetch single download bang `syncHeroVideosToCloud(data);`.
- Thay block fetch batch download bang:
```javascript
    syncHeroVideosToCloud(checkedData).then((result) => {
        if (result.success) {
            Tips("Da dong bo " + result.synced + " video len AI2Hero!", 3000);
        }
    });
```
- Giu nguyen logic `chrome.downloads.download`.

### 2.5. Vung CAM (trong task nay)
- Khong sua `openParser`, `catDownload`, `aria2AddUri`, `getCheckedData`.
- Khong thay doi UI danh sach media.
- Khong bat sync lam blocker cua download; download van phai chay ke ca sync fail.

### 2.6. Phu thuoc
Nen lam sau Task 1. Co the lam doc lap voi Task 3.

### 2.7. Verification (Cach kiem tra dung/sai)
- Chay `rg -n "api/video/extension/sync" app/extension/herovideo/js/popup.js` va dam bao chi con 1 vi tri fetch trong helper.
- Chay `rg -n "syncHeroVideosToCloud|toHeroVideoPayload" app/extension/herovideo/js/popup.js` de dam bao single va batch cung goi helper.
- Manual verify: single download va batch download van goi `chrome.downloads.download`.

### 2.8. Ket qua mong doi
Sync cloud cua HeroVideo co mot duong code duy nhat, it lap loi, co check response, va khong bao thanh cong gia khi API that bai.

---

## TASK 3: Validate va gioi han API `/api/video/extension/sync`

### 3.1. Mo ta
API sync hien nhan bat ky array `videos`, khong gioi han batch, khong validate URL/length/type. Token hop le co the bi dung de day du lieu rac hoac tao tai DB. Task nay them validate nhe bang `zod`, gioi han batch, va chi chap nhan field can thiet.

### 3.2. Files can sua
| File | Hanh dong | Dong uoc tinh |
|---|---|---|
| `app/app/api/video/extension/sync/route.ts` | MODIFY | ~100 dong |

### 3.3. Code Snapshot tai diem sua
```typescript
    const body = await request.json();
    const { videos } = body;

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ success: false, error: 'Danh sÃ¡ch video trá»‘ng' }, { status: 400, headers: CORS_HEADERS });
    }

    let synced = 0;

    for (const video of videos) {
      const { title, url, size, mimeType, thumbnailUrl } = video;
      if (!url) continue;
```

### 3.4. Thay doi can thuc hien
- Them import:
```typescript
import { z } from 'zod';
```
- Them constants va schema gan dau file:
```typescript
const MAX_SYNC_BATCH_SIZE = 50;

const videoSyncItemSchema = z.object({
  title: z.string().trim().max(255).optional().default('Video khong ten'),
  url: z.string().trim().url().max(4000),
  size: z.string().trim().max(50).optional().nullable(),
  mimeType: z.string().trim().max(100).optional().nullable(),
  thumbnailUrl: z.string().trim().url().max(4000).optional().nullable(),
});

const videoSyncSchema = z.object({
  videos: z.array(videoSyncItemSchema).min(1).max(MAX_SYNC_BATCH_SIZE),
});
```
- Sau `request.json()`, parse bang:
```typescript
const parsed = videoSyncSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { success: false, error: 'Payload video khong hop le' },
    { status: 400, headers: CORS_HEADERS }
  );
}
const { videos } = parsed.data;
```
- Xoa check `Array.isArray` cu.
- Trong loop, dung data da parse.
- Khi update existing, khong set title thanh undefined. Neu title empty sau trim thi dung `'Video khong ten'`.
- Neu can, them duplicate in-memory theo URL trong batch de tranh update lap:
```typescript
const seenUrls = new Set<string>();
...
if (seenUrls.has(url)) continue;
seenUrls.add(url);
```

### 3.5. Vung CAM (trong task nay)
- Khong sua `verifyExtensionToken`.
- Khong sua schema `videoAssets`.
- Khong them migration DB trong plan nay.
- Khong doi CORS header o task nay, vi extension can goi API tu Chrome extension context.

### 3.6. Phu thuoc
Co the lam song song Task 2, nhung nen merge sau Task 2 de test end-to-end.

### 3.7. Verification (Cach kiem tra dung/sai)
- Chay `pnpm build` trong `app/`.
- Dung manual/API smoke test voi payload hop le 1 video: API tra `{ success: true, synced: 1 }`.
- Dung payload `videos: []`: API tra HTTP 400.
- Dung payload > 50 videos: API tra HTTP 400.
- Dung URL sai format: API tra HTTP 400.

### 3.8. Ket qua mong doi
API sync chi nhan payload hop le, batch bi gioi han, DB khong bi spam bang du lieu rong/sai format, trong khi extension van sync duoc metadata video binh thuong.

---

## TASK 4: Sua UX mo thu muc va trang thai ket noi workspace

### 4.1. Mo ta
Dashboard hien copy `%USERPROFILE%\Downloads\HeroVideo\[workspaceSlug]` va goi extension mo default download folder. Day la hanh vi gay nham lan vi Chrome chi mo thu muc download mac dinh, khong mo duoc subfolder workspace. Task nay lam UI noi dung dung su that va dam bao message mo folder chi duoc extension chap nhan tu AI2Hero origin.

### 4.2. Files can sua
| File | Hanh dong | Dong uoc tinh |
|---|---|---|
| `app/app/(dashboard)/herovideodownload/dashboard/video-list-client.tsx` | MODIFY | ~35 dong |
| `app/extension/herovideo/js/content-script.js` | MODIFY | ~10 dong |

### 4.3. Code Snapshot tai diem sua
`video-list-client.tsx` hien tai:
```typescript
  const handleOpenFolder = async () => {
    const folderPath = `%USERPROFILE%\\Downloads\\HeroVideo\\${workspaceSlug}`;
    try {
      await navigator.clipboard.writeText(folderPath);
      showToast(`ÄÃ£ copy Ä‘Æ°á»ng dáº«n: ${folderPath}`, 'success');
    } catch (e) {
      console.warn("Lá»—i copy clipboard:", e);
    }
    
    // Gá»­i tÃ­n hiá»‡u kÃ­ch hoáº¡t má»Ÿ thÆ° má»¥c tá»›i extension
    window.postMessage({ type: 'HERO_VIDEO_OPEN_FOLDER' }, '*');
  };
```

`content-script.js` hien tai:
```javascript
        // Nháº­n diá»‡n sá»± kiá»‡n yÃªu cáº§u má»Ÿ thÆ° má»¥c downloads máº·c Ä‘á»‹nh
        if (event.data && event.data.type === 'HERO_VIDEO_OPEN_FOLDER') {
            chrome.runtime.sendMessage({ Message: "openDefaultFolder" });
        }
```

### 4.4. Thay doi can thuc hien
Trong `video-list-client.tsx`:
- Doi `folderPath` thanh hint ro rang:
```typescript
const folderPath = `Downloads\\HeroVideo\\${workspaceSlug}`;
```
- Doi toast thanh noi dung dung hanh vi:
```typescript
showToast(`Da copy duong dan workspace: ${folderPath}. Extension se mo thu muc Downloads mac dinh.`, 'success');
```
- Gui message kem workspaceSlug:
```typescript
window.postMessage({ type: 'HERO_VIDEO_OPEN_FOLDER', workspaceSlug }, window.location.origin);
```
- Neu `navigator.clipboard.writeText` fail, van postMessage de extension mo default folder.

Trong `content-script.js`:
- Tai handler `HERO_VIDEO_OPEN_FOLDER`, dung helper `isAllowedAi2HeroOrigin(event.origin)` da them o Task 1.
- Neu origin khong hop le thi return.
- Neu co `workspaceSlug`, set lai `herovideo_subfolder` bang `HeroVideo/${workspaceSlug}` truoc khi goi `openDefaultFolder`.

### 4.5. Vung CAM (trong task nay)
- Khong co gang mo truc tiep subfolder bang path local vi Chrome extension API khong cho mo arbitrary folder path.
- Khong dung native messaging trong plan nay.
- Khong sua File System Access permission flow.

### 4.6. Phu thuoc
Phu thuoc Task 1 vi dung chung helper allowlist origin trong `content-script.js`.

### 4.7. Verification (Cach kiem tra dung/sai)
- Chay `rg -n "%USERPROFILE%|HERO_VIDEO_OPEN_FOLDER|isAllowedAi2HeroOrigin" "app/app/(dashboard)/herovideodownload/dashboard/video-list-client.tsx" app/extension/herovideo/js/content-script.js`.
- Dam bao `%USERPROFILE%` khong con trong UI.
- Manual verify: Bam `Mo thu muc` tren dashboard, clipboard co `Downloads\HeroVideo\[workspaceSlug]`, extension mo default Downloads folder, va khong co token bi post ra page.

### 4.8. Ket qua mong doi
User khong bi hua sai ve viec mo dung subfolder. Dashboard van giup user nhay vao Downloads nhanh va copy dung path workspace de paste/search.

---

## THU TU THUC HIEN
Task 1 -> Task 4 vi cung sua `content-script.js`.
Task 2 va Task 3 co the lam sau Task 1, nhung nen test chung.
Thu tu khuyen nghi: Task 1 -> Task 2 -> Task 3 -> Task 4 -> Build/Manual Smoke Test.

## SAU KHI HOAN TAT
- Cap nhat START.md: them log ngay 2026-06-01 ve viec harden HeroVideo Extension token boundary, sync API validation, va folder UX.
- Cap nhat UI_MAP.md: chi can cap nhat neu co mo ta HeroVideo data flow chi tiet.
- Khong cap nhat LESSONS.md tru khi trong luc code phat hien pattern loi moi.

## CHECKLIST QUALITY GATE
- [x] Moi task co du 8 muc (1.1 -> 1.8)
- [x] Moi task co code snapshot lay tu file that
- [x] Vung CAM da liet ke
- [x] Dependency ro rang
- [x] Moi task <= 2 file, <= 200 dong thay doi
- [x] Verification co the tu kiem tra
- [x] Uu tien sua loi truoc, chua lam toi uu/feature moi
