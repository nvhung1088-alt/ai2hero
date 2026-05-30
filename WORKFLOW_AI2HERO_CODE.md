# WORKFLOW: AI2HERO CODE (v2 — Subagent Edition)
> **Kích hoạt**: Khi admin gõ `ai2hero code` hoặc `ai2hero code PLAN_XXX.md`
> **Model**: Gemini 3.5 Flash (hoặc model đang chọn trên UI)
> **Kiến trúc**: Orchestrator + 4 Subagents chuyên biệt per task

---

## KIẾN TRÚC THỰC THI

```
Flash Orchestrator (đọc Plan, điều phối, tổng kết)
│
├── Task 1 ──────────────────────────────────────
│   ├── spawn task_auditor   → AUDIT HANDOFF
│   ├── spawn task_planner   → DETAIL PLAN
│   ├── spawn task_coder     → CODE REPORT
│   └── spawn task_reviewer  → REVIEW REPORT
│
├── Task 2 ──────────────────────────────────────
│   ├── spawn task_auditor   → AUDIT HANDOFF
│   ├── spawn task_planner   → DETAIL PLAN
│   ├── spawn task_coder     → CODE REPORT
│   └── spawn task_reviewer  → REVIEW REPORT
│
├── ... (tối đa 5 tasks)
│
└── Tổng kết → Báo cáo cuối → Cập nhật START.md
```

**Mỗi subagent có context SẠCH** — không bị ô nhiễm bởi task trước.

---

## BƯỚC 0: KHỞI ĐỘNG

### 0.1. Xác định file Plan
- `ai2hero code PLAN_XXX.md` → đọc file đó
- `ai2hero code` (không chỉ định) → tìm file `PLAN_*.md` mới nhất
- Không tìm thấy → hỏi admin

### 0.2. Đọc Plan + START.md + LESSONS.md (INDEX only)

### 0.3. Define 4 Subagents

| Subagent | TypeName | Write tools | Vai trò |
|----------|----------|-------------|---------|
| 🔍 Auditor | `task_auditor` | ❌ Read-only | Quét file, grep, đối chiếu Plan |
| 📝 Planner | `task_planner` | ❌ Read-only | Viết Detail Plan chính xác đến từng dòng |
| ⚡ Coder | `task_coder` | ✅ Write | PRE-CHECK → Surgical Fix |
| 📋 Reviewer | `task_reviewer` | ❌ Read-only | Check 5 tiêu chí, chấm điểm |

### 0.4. Thông báo
```
══════════════════════════════════════
🚀 AI2HERO CODE v2 — BẮT ĐẦU
══════════════════════════════════════
📄 Plan: [tên file]
📌 Tasks: [N] (tối đa 5)
📌 Subagents: 4 (Auditor, Planner, Coder, Reviewer)
📌 LESSONS: [mã liên quan]
══════════════════════════════════════
```

---

## VÒNG LẶP: Task i = 1 → N (tối đa 5)

### ── 1. SPAWN AUDITOR ──
Quét file, đối chiếu Code Snapshot, tìm call sites → AUDIT HANDOFF.
Nếu Audit kết luận "❌ KHÔNG THỂ CODE" → SKIP task.

### ── 2. SPAWN PLANNER ──
Đọc Audit Handoff → viết DETAIL PLAN (Edit 1, Edit 2... với TargetContent/ReplacementContent).

### ── 3. SPAWN CODER ──
Đọc Detail Plan → PRE-CHECK → Surgical Fix.
Edit fail = DỪNG CỨNG → ghi lỗi → vẫn spawn Reviewer cho edits đã xong.

### ── 4. SPAWN REVIEWER ──
Đọc Code Report → view file đã sửa → chấm 5 tiêu chí → REVIEW REPORT (điểm/50).

---

## SAU KHI HOÀN TẤT

1. Cập nhật START.md
2. Cập nhật UI_MAP.md (nếu UI thay đổi)
3. Tổng hợp đề xuất LESSONS từ các Reviewer
4. Xuất BÁO CÁO TỔNG KẾT

---

## XỬ LÝ LỖI — BẢNG TRA NHANH

| Tình huống | Hành động |
|---|---|
| Không tìm thấy Plan | Hỏi admin |
| Audit fail (code lệch Plan) | SKIP task → task tiếp |
| Coder DỪNG CỨNG | Spawn Reviewer cho edits đã xong → ghi lỗi → task tiếp |
| Review FAIL (<35/50) | Ghi lỗi → task tiếp |
| Task phụ thuộc task đã SKIP | Auto SKIP → ghi lý do |
| Tất cả tasks FAIL | Dừng hẳn → báo admin "Plan cần cập nhật" |
