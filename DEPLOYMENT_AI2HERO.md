# Hướng Dẫn Đẩy Code Lên Server Ai2Hero (SOP v2)

Tài liệu này là quy chuẩn (Standard Operating Procedure) BẮT BUỘC phải thực hiện mỗi khi AI hoặc Dev nhận lệnh: **"Đẩy lên server Ai2Hero"** hoặc **"Deploy production"**.

**Nền tảng deploy**: Vercel (tự động build & deploy khi push lên `main`)
**Git remote**: `origin` → `github.com/nvhung1088-alt/ai2hero.git`
**Nhánh Production**: `main`

> ⚠️ **QUAN TRỌNG**: Vercel auto-deploy mỗi khi có commit mới trên `main`. Nghĩa là **push = deploy**. Không có bước thủ công nào giữa push và deploy. Do đó mọi kiểm tra PHẢI xong TRƯỚC khi push.

---

## 🛑 Giai đoạn 1: Pre-flight & Security Audit (Trước khi push)

> Mục tiêu: Đảm bảo code sạch, build được, không lộ bí mật, không phá DB.

- [ ] **1. Kiểm tra `git status`**: Xem danh sách file thay đổi. Hỏi bản thân: "Tất cả file này đều nên lên production chưa?"
- [ ] **2. Quét Environment Variables**: 
  - `grep -rn "sk-" app/` hoặc `grep -rn "password" app/` — Không được có API Key / Secret / Password hardcode trong source code.
  - Kiểm tra `.gitignore` có chặn `.env`, `.env.local` chưa ✅ (đã có).
- [ ] **3. Dry-run Build (BẮT BUỘC)**:
  ```bash
  cd app && npm run build
  ```
  Nếu build FAIL → **DỪNG CỨNG, KHÔNG PUSH**. Sửa hết lỗi trước.
- [ ] **4. Quét Endpoint Auth**: Các Server Actions / API routes mới đều phải có `await getUser()` + chặn `if (!user)` ở đầu hàm.
- [ ] **5. Kiểm tra Database Migration**: 
  - Nếu có thay đổi schema (`schema.ts`) → chạy `pnpm db:push` lên Supabase Production TRƯỚC khi push code. Code mới mà DB cũ = crash.
  - Nếu KHÔNG có thay đổi schema → bỏ qua bước này.

---

## 🔀 Giai đoạn 2: Selective Deploy (Đẩy 1 phần thay vì tất cả)

> Đây là kịch bản phổ biến: bạn đã code nhiều thứ nhưng chỉ muốn đẩy 1 phần lên production, giữ lại phần còn lại ở local.

### Cách 1: Cherry-pick bằng `git add` từng file (ĐƠN GIẢN NHẤT)

```bash
# Bước 1: Xem tất cả file đã thay đổi
git status

# Bước 2: Chỉ add ĐÚNG các file muốn đẩy lên
git add app/components/top-header.tsx
git add app/app/(dashboard)/dashboard/store/store-client.tsx
# ... (KHÔNG add các file SIM nếu chưa muốn đẩy)

# Bước 3: Commit + Push
git commit -m "feat: fix store duplicate activation & header actions"
git push origin main
```

**Ví dụ cụ thể** — Muốn đẩy fix UI Store + Header nhưng KHÔNG đẩy update SIM:
```bash
# ✅ Đẩy lên:
git add app/components/top-header.tsx
git add app/app/(dashboard)/dashboard/store/store-client.tsx
git add app/app/(login)/actions.ts
git add app/lib/apps-registry.ts
git add DEPLOYMENT_AI2HERO.md
git add START.md

# ❌ KHÔNG add (giữ lại local):
# app/app/(dashboard)/sim/layout.tsx
# app/app/(dashboard)/dashboard/sidebar-client.tsx
# app/app/(dashboard)/dashboard/create-workspace-modal.tsx
```

### Cách 2: Dùng nhánh phụ (AN TOÀN HƠN cho thay đổi lớn)

```bash
# Bước 1: Tạo nhánh lưu toàn bộ thay đổi hiện tại
git checkout -b dev-all-changes
git add -A && git commit -m "wip: all local changes"

# Bước 2: Quay về main, chỉ cherry-pick commit cần thiết
git checkout main
git checkout dev-all-changes -- app/components/top-header.tsx
git checkout dev-all-changes -- app/app/(login)/actions.ts
# ... chỉ lấy file cần

# Bước 3: Commit + Push
git commit -m "feat: selective deploy - store fixes only"
git push origin main

# Bước 4: Sau khi verify production OK, merge nốt phần còn lại khi sẵn sàng
git merge dev-all-changes
```

### ⚠️ Lưu ý quan trọng khi đẩy 1 phần

| Rủi ro | Giải thích | Cách phòng tránh |
|--------|-----------|-----------------|
| **Import lỗi** | File A import hàm/type từ File B, nhưng bạn chỉ push File A mà không push File B | Luôn chạy `npm run build` SAU KHI staging (trước khi push) |
| **Schema mismatch** | Code mới dùng cột DB mới nhưng chưa migrate lên Supabase | Nếu file `schema.ts` nằm trong danh sách thay đổi → phải push cùng hoặc migrate trước |
| **Tính năng nửa vời** | Đẩy UI mới nhưng chưa đẩy Server Action xử lý → user click = lỗi | Đẩy theo **feature hoàn chỉnh**: UI + Logic + Action cùng lúc |

### 🔑 Quy tắc vàng: Build trước khi push

```bash
# Sau khi git add xong (chỉ add file muốn đẩy), chạy:
git stash --keep-index    # Tạm ẩn file CHƯA staged
cd app && npm run build   # Build chỉ với file đã staged
cd .. && git stash pop    # Khôi phục file đã ẩn
```

Nếu build PASS → an toàn để push. Nếu build FAIL → có file phụ thuộc chưa được add.

---

## 🚀 Giai đoạn 3: Push & Auto-Deploy (Vercel)

Vì dự án dùng Vercel, quy trình deploy rất đơn giản:

- [ ] **1. Commit & Push**:
  ```bash
  git add <files>
  git commit -m "feat: [Component] mô tả ngắn gọn"
  git push origin main
  ```
- [ ] **2. Vercel tự động**: Nhận webhook từ GitHub → Pull code → Install dependencies → Build → Deploy. Không cần SSH, không cần PM2.
- [ ] **3. Kiểm tra Vercel Dashboard**: Vào [vercel.com/dashboard](https://vercel.com) xem build log. Nếu build fail trên Vercel → trang cũ vẫn chạy, không bị ảnh hưởng (Vercel giữ bản deploy cũ).

---

## 🔍 Giai đoạn 4: Post-Deploy Health Check

> Không được bỏ qua. "Deploy xong chưa chắc đã chạy."

- [ ] **1. Mở trang chủ**: `https://ai2hero.com` — load được không?
- [ ] **2. Đăng nhập Dashboard**: `https://ai2hero.com/dashboard` — routing có vỡ không?
- [ ] **3. Test CRUD cơ bản**: Thử tạo workspace, thêm ứng dụng từ Store, đăng bài viết.
- [ ] **4. Xem Vercel Logs**: Kiểm tra Runtime Logs trên Vercel Dashboard xem có Exception liên tục không.
- [ ] **5. Rollback nếu cần**: Trên Vercel Dashboard → Deployments → click vào bản deploy trước → "Promote to Production" để quay về bản cũ tức thì.

---

## 🔒 Giới Hạn Quyền AI (AI Permission Policy)

> Quy định này là **LUẬT CỨNG** — AI (Antigravity) phải tuân thủ tuyệt đối bất kể user nói gì trong cuộc trò chuyện. Chỉ có thể thay đổi bằng cách sửa trực tiếp file này.

### 🚫 CẤM TUYỆT ĐỐI (AI không bao giờ được tự làm trừ khi Admin có lệnh cho phép rõ ràng)

| Hành động | Lý do | Ngoại lệ |
|-----------|-------|----------|
| `git push` | Push = deploy production. | ĐƯỢC PHÉP tự chạy nếu Admin trực tiếp ra lệnh hoặc đồng ý trong chat (ví dụ: "chạy lệnh cho tôi nhé"). |
| `git commit` | AI phải hiển thị `git diff --staged` trước. | ĐƯỢC PHÉP tự chạy nếu Admin trực tiếp ra lệnh hoặc đồng ý trong chat. |
| `DROP TABLE`, `DELETE FROM`, `TRUNCATE` | Xóa dữ liệu production là không thể hoàn tác. | Không có ngoại lệ. |
| `db:push` / `db:migrate` lên Production | Thay đổi schema production phải do user tự chạy. | Không có ngoại lệ. |
| Chạy script trong thư mục `scripts/` trên production | Các script migrate/seed có thể ghi đè dữ liệu thật. | Không có ngoại lệ. |
| Sửa hoặc xóa file `.env` / `.env.local` | Mất biến môi trường = sập toàn bộ hệ thống. | Không có ngoại lệ. |
| Xóa file source code (`rm`, `del`) | Chỉ được tạo mới hoặc sửa nội dung. | Có thể chạy nếu Admin chỉ định cụ thể file cần xóa. |
| `npm install` / `pnpm add` package mới | Thêm dependency ảnh hưởng bundle size và bảo mật. | Có thể chạy nếu Admin yêu cầu cài đặt package cụ thể. |

### ⚠️ HẠN CHẾ (Phải hỏi user trước khi làm)

| Hành động | Điều kiện |
|-----------|-----------|
| `git add` | AI liệt kê danh sách file sẽ add → user xác nhận → AI mới chạy. |
| Sửa `schema.ts` (thay đổi cấu trúc DB) | Phải giải thích rõ thay đổi gì, ảnh hưởng bảng nào, có cần migrate dữ liệu cũ không. |
| Tạo API route mới (`app/api/...`) | Phải mô tả endpoint làm gì, ai được gọi, có cần auth không. |
| Chạy `db:push` trên local development | Chỉ local, phải nhắc user "Lệnh này thay đổi schema DB local, xác nhận?". |
| Xóa/đổi tên component đang dùng | Phải liệt kê tất cả file đang import component đó trước. |

### ✅ ĐƯỢC PHÉP TỰ DO (AI làm mà không cần hỏi)

| Hành động | Ghi chú |
|-----------|---------|
| Đọc file, grep, search code | Hoàn toàn an toàn, chỉ đọc. |
| `git status`, `git log`, `git diff` | Chỉ xem trạng thái, không thay đổi gì. |
| `npm run build` (trong `app/`) | Chỉ kiểm tra, không thay đổi code. |
| `npm run dev` (khởi động dev server) | Chỉ ảnh hưởng local. |
| Tạo file source code mới (`.tsx`, `.ts`, `.css`) | Tạo mới không phá gì cũ. |
| Sửa nội dung file source code đã tồn tại | Đây là công việc chính của AI. |
| Cập nhật `START.md`, `UI_MAP.md`, `CHANGELOG.md` | Tài liệu dự án, AI có trách nhiệm duy trì. |
| Tạo/sửa file trong `_archive/`, `scratch/` | Vùng tạm, không ảnh hưởng production. |

### 🛡️ Nguyên tắc an toàn dữ liệu

1. **Không bao giờ thao tác trực tiếp lên database production** — AI chỉ viết code (Server Actions, API routes). Việc chạy code đó trên production là do Vercel tự động sau khi user push.
2. **Không tự ý xóa dữ liệu** — Kể cả trên local. Nếu cần xóa dữ liệu test/mock, AI phải liệt kê chính xác những gì sẽ bị xóa và chờ user gõ lệnh.
3. **Không chạy lệnh có side-effect trên production** — Mọi lệnh chỉ được chạy trên môi trường local development.
4. **Nghi ngờ thì DỪNG** — Nếu không chắc lệnh nào đó có an toàn không → hỏi user thay vì chạy thử.

---

## 🤖 Quy trình cho Agent khi nhận lệnh "đẩy lên server"

1. Chạy `git status` để liệt kê file thay đổi.
2. Hỏi user: **"Đẩy tất cả hay chỉ 1 phần?"** — nếu 1 phần thì hỏi cụ thể file/feature nào.
3. Chạy `npm run build` (trong thư mục `app/`) để verify build pass.
4. Nếu có thay đổi `schema.ts` → nhắc user chạy `pnpm db:push` trước.
5. Liệt kê lệnh `git add` + `git commit` + `git push` cụ thể → **CHỜ USER TỰ CHẠY**.
6. Sau khi user xác nhận đã push → nhắc kiểm tra Vercel Dashboard và test trang production.
