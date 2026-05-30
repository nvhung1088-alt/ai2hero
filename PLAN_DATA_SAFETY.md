# PLAN_DATA_SAFETY — Bảo vệ Dữ liệu khi Xóa Workspace & Hủy kích hoạt App
> Ngày tạo: 2026-05-29
> Tác giả: Claude Opus (CTO/Architect)
> Số tasks: 3
> Ước tính: ~15 phút cho Flash thực thi

## MỤC TIÊU TỔNG
Khắc phục 3 lỗ hổng dữ liệu nghiêm trọng được phát hiện trong Audit Report:
1. `deleteWorkspaceAction` đang xóa cứng (Hard Delete) trong khi schema đã thiết kế sẵn trường `deletedAt` cho Soft-Delete → Mất vĩnh viễn lịch sử Stripe, Feed, SIM data.
2. Các Server Actions nghiệp vụ SIM (`sim-actions.ts`) không kiểm tra app có đang được kích hoạt (`activatedApps`) hay không → Cho phép bypass tương tác dữ liệu khi app đã tắt.
3. Các queries truy vấn danh sách teams (`getTeamsForUser`, `getTeamForUser`, `getTeamWithMembers`) chưa lọc `deletedAt IS NULL` → Sau khi soft-delete, workspace xóa vẫn hiện trên UI.

## BỐI CẢNH KIẾN TRÚC
- **Module liên quan**: Core Platform Actions (`actions.ts`), SIM MVP Actions (`sim-actions.ts`), Database Queries (`queries.ts`)
- **Data flow**: User → Server Action → Drizzle ORM → PostgreSQL
- Schema bảng `teams` đã có trường `deletedAt: timestamp('deleted_at')` nhưng chưa ai dùng
- Hàm `verifyTeamAccess` trong `sim-actions.ts` chỉ kiểm tra membership, chưa kiểm tra app activation

## RÀNG BUỘC TOÀN CỤC (Global Constraints)
- KHÔNG sửa: `schema.ts` (schema đã có `deletedAt` sẵn rồi, không cần thay đổi)
- KHÔNG sửa: UI components (store-client.tsx, settings page, layout...) — plan này chỉ sửa tầng backend
- KHÔNG đổi tên: `deleteWorkspaceAction`, `deactivateAppAction`, `verifyTeamAccess`, `getTeamsForUser`, `getTeamForUser`, `getTeamWithMembers` — giữ nguyên tên hàm hiện tại
- CSS: Không thay đổi
- Data: Nguồn sự thật logic là `actions.ts`, `sim-actions.ts`, `queries.ts`

## LESSONS CẦN NHỚ
- **4.35**: Quá tải kết nối PostgreSQL → Giữ query đơn giản, dùng `and()` operator chuẩn
- **4.36**: Lỗi Parameter Binding Date trong Drizzle → Dùng operator Drizzle chuẩn (`isNull`)
- **7.1**: Plan phải ghi CHÍNH XÁC tên hàm/dòng, kèm context
- **1.2**: KHÔNG đổi tên biến/hàm đang chạy tốt

---

## TASK 1: Chuyển deleteWorkspaceAction sang Soft-Delete

### 1.1. Mô tả
Thay đổi cơ chế xóa workspace từ Hard Delete (xóa vĩnh viễn 4 bảng) sang Soft Delete (chỉ cập nhật `deletedAt = now()` trên bảng `teams`). Giữ lại toàn bộ dữ liệu liên quan (team_members, invitations, activity_logs, feed, SIM data) trong DB để có thể khôi phục sau này. Đồng thời xóa liên kết thành viên (`team_members`) để các thành viên không còn truy cập workspace đã xóa.

### 1.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/app/(login)/actions.ts` | MODIFY | ~20 dòng thay đổi |

### 1.3. Code Snapshot tại điểm sửa
```typescript
// File: app/app/(login)/actions.ts — Dòng 657-682
export async function deleteWorkspaceAction(data: { teamId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { teamId } = data;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!member || member.role !== 'owner') {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu mới có quyền xóa không gian làm việc.' };
  }

  // Clean up relations first
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  await db.delete(invitations).where(eq(invitations.teamId, teamId));
  await db.delete(activityLogs).where(eq(activityLogs.teamId, teamId));
  await db.delete(teams).where(eq(teams.id, teamId));

  return { success: 'Đã xóa không gian làm việc thành công.' };
}
```

### 1.4. Thay đổi cần thực hiện
Thay thế khối xóa cứng 4 dòng `db.delete(...)` (dòng 675-679) bằng logic Soft-Delete:

```typescript
  // Soft-delete: đánh dấu workspace đã xóa, giữ nguyên dữ liệu trong DB
  await db
    .update(teams)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));

  // Xóa liên kết thành viên để họ không còn truy cập workspace này
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  // Hủy tất cả lời mời đang chờ
  await db.delete(invitations).where(eq(invitations.teamId, teamId));
```

Comment cũ `// Clean up relations first` đổi thành `// Soft-delete: đánh dấu workspace đã xóa, giữ nguyên dữ liệu trong DB`.

### 1.5. Vùng CẤM (trong task này)
- KHÔNG đụng các hàm: `createWorkspaceAction`, `updateWorkspaceAction`, `activateAppAction`, `deactivateAppAction`
- KHÔNG đụng imports đầu file
- KHÔNG xóa bất kỳ comment nào ngoài khối đang sửa

### 1.6. Phụ thuộc
Không — Task này độc lập.

### 1.7. Verification (Cách kiểm tra đúng/sai)
1. `pnpm build` — phải compile thành công 0 errors
2. Đọc lại hàm `deleteWorkspaceAction` trong file — xác nhận KHÔNG còn `db.delete(teams)`, KHÔNG còn `db.delete(activityLogs)`, chỉ có `db.update(teams).set({ deletedAt: ... })` và `db.delete(teamMembers)` + `db.delete(invitations)`

### 1.8. Kết quả mong đợi
- Khi owner xóa workspace: bảng `teams` giữ nguyên bản ghi với `deleted_at = timestamp`, toàn bộ feed_posts, sim_assets, activity_logs vẫn còn trong DB
- Thành viên bị ngắt liên kết (team_members xóa sạch)
- Lời mời pending bị hủy (invitations xóa sạch)

---

## TASK 2: Lọc Soft-Deleted Teams khỏi Queries

### 2.1. Mô tả
Sau khi Task 1 chuyển sang Soft-Delete, các hàm truy vấn danh sách teams PHẢI lọc `WHERE deleted_at IS NULL` để workspace đã xóa mềm không hiển thị trên UI (Sidebar, Dashboard, Store dropdown). File `queries.ts` đã import sẵn `isNull` từ `drizzle-orm` (dòng 1).

### 2.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/queries.ts` | MODIFY | ~15 dòng thay đổi (3 hàm) |

### 2.3. Code Snapshot tại điểm sửa

**Điểm sửa A — `getTeamForUser` (dòng 102-130):**
```typescript
export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}
```

**Điểm sửa B — `getTeamsForUser` (dòng 132-162):**
```typescript
export async function getTeamsForUser(userId: number) {
  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return memberships.map((m) => {
    if (!m.team) return null;
    return {
      ...m.team,
      role: m.role,
      memberCount: m.team.teamMembers?.length || 0,
    };
  }).filter(Boolean) as any[];
}
```

**Điểm sửa C — `getTeamWithMembers` (dòng 164-183):**
```typescript
export async function getTeamWithMembers(teamId: number) {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    with: {
      teamMembers: {
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });

  return team || null;
}
```

### 2.4. Thay đổi cần thực hiện

**Điểm A (`getTeamForUser`)**: Hàm dùng Drizzle relational query nên không thể WHERE trực tiếp trên bảng `teams`. Thay vào đó, thêm filter sau khi query:
```typescript
  // Thêm dòng kiểm tra soft-delete TRƯỚC return cuối
  if (result?.team?.deletedAt) return null;
  return result?.team || null;
```

**Điểm B (`getTeamsForUser`)**: Thêm điều kiện lọc trong `.filter()`:
```typescript
  return memberships.map((m) => {
    if (!m.team) return null;
    if (m.team.deletedAt) return null; // Lọc workspace đã xóa mềm
    return {
      ...m.team,
      role: m.role,
      memberCount: m.team.teamMembers?.length || 0,
    };
  }).filter(Boolean) as any[];
```

**Điểm C (`getTeamWithMembers`)**: Thêm kiểm tra sau khi query:
```typescript
  if (team?.deletedAt) return null; // Workspace đã bị xóa mềm
  return team || null;
```

### 2.5. Vùng CẤM (trong task này)
- KHÔNG đụng: `getUser`, `getTeamByStripeCustomerId`, `updateTeamSubscription`, `getUserWithTeam`, `getActivityLogs`, `getFeedPosts`, `getInvitationsForTeam`, `getSystemSetting`, `updateSystemSetting`
- KHÔNG thay đổi imports (dòng 1-5)
- KHÔNG đổi type/interface nào

### 2.6. Phụ thuộc
Task 1 phải hoàn thành trước (để `deletedAt` được set khi xóa workspace).

### 2.7. Verification (Cách kiểm tra đúng/sai)
1. `pnpm build` — phải compile thành công 0 errors
2. Grep trong `queries.ts` tìm `deletedAt` — phải xuất hiện tại 3 hàm: `getTeamForUser`, `getTeamsForUser`, `getTeamWithMembers`

### 2.8. Kết quả mong đợi
- Workspace đã xóa mềm (`deletedAt IS NOT NULL`) không hiển thị trên: Sidebar accordion, Dashboard board cards, Store team dropdown, Workspace detail page
- Hàm query trả về `null` khi truy cập workspace đã xóa mềm → UI hiển thị "Không tìm thấy"

---

## TASK 3: Thêm App Activation Gating vào SIM Server Actions

### 3.1. Mô tả
Bổ sung lớp kiểm tra `activatedApps` tại hàm helper `verifyTeamAccess` trong `sim-actions.ts`. Khi SIM Manager bị hủy kích hoạt (`'sim'` không nằm trong `teams.activatedApps`), mọi Server Action ghi dữ liệu SIM (create, update, delete, import...) phải bị từ chối. Điều này chặn bypass backend khi app đã bị tắt trên UI.

### 3.2. Files cần sửa
| File | Hành động | Dòng ước tính |
|---|---|---|
| `app/lib/db/sim-actions.ts` | MODIFY | ~20 dòng thay đổi |

### 3.3. Code Snapshot tại điểm sửa
```typescript
// File: app/lib/db/sim-actions.ts — Dòng 1-51
'use server';

import { and, eq, inArray } from 'drizzle-orm';
import { db } from './drizzle';
import {
  simEmployees,
  simAssets,
  simLinkedAccounts,
  simRiskEvents,
  simCheckLogs,
  teamMembers,
  activityLogs,
  type NewSimAsset,
  type SimAsset,
  type NewSimLinkedAccount,
  type SimLinkedAccount,
  type NewSimEmployee,
  type SimEmployee,
  type NewSimCheckLog
} from './schema';
import { getUser } from './queries';

// Helper function to check if the current user belongs to the target team and has write permissions
async function verifyTeamAccess(targetTeamId: number, requireRole?: string[]) {
  const user = await getUser();
  if (!user) {
    throw new Error('Chưa đăng nhập');
  }

  // Check if user is member of the team
  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, user.id),
        eq(teamMembers.teamId, targetTeamId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error('Quyền truy cập bị từ chối');
  }

  if (requireRole && !requireRole.includes(membership.role)) {
    throw new Error('Bạn không có quyền thực hiện thao tác này');
  }

  return { user, membership };
}
```

### 3.4. Thay đổi cần thực hiện

**Bước 1**: Thêm import bảng `teams` vào danh sách import hiện có (dòng 5-20). Thêm `teams` vào destructure:
```typescript
import {
  simEmployees,
  simAssets,
  simLinkedAccounts,
  simRiskEvents,
  simCheckLogs,
  teamMembers,
  teams,           // ← THÊM MỚI
  activityLogs,
  // ... giữ nguyên phần còn lại
```

**Bước 2**: Thêm tham số `requiredApp` vào hàm `verifyTeamAccess` và bổ sung logic kiểm tra `activatedApps`. Sửa signature và thêm khối check SAU khối kiểm tra role (sau dòng 48):

```typescript
async function verifyTeamAccess(targetTeamId: number, requireRole?: string[], requiredApp?: string) {
  // ... giữ nguyên toàn bộ code hiện có ...

  // (THÊM MỚI) Kiểm tra app có được kích hoạt trong workspace không
  if (requiredApp) {
    const [team] = await db
      .select({ activatedApps: teams.activatedApps })
      .from(teams)
      .where(eq(teams.id, targetTeamId))
      .limit(1);

    const activeApps = Array.isArray(team?.activatedApps) ? (team.activatedApps as string[]) : [];
    if (!activeApps.includes(requiredApp)) {
      throw new Error('Ứng dụng chưa được kích hoạt trong không gian làm việc này');
    }
  }

  return { user, membership };
}
```

**Bước 3**: Thêm tham số `'sim'` vào MỌI lời gọi `verifyTeamAccess` trong file. Có tổng cộng **11 call sites** cần sửa. Pattern thay đổi:
- `verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'])` → `verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim')`
- `verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'])` (không có role array không xảy ra trong file này)

**Danh sách 11 call sites (theo thứ tự xuất hiện):**
1. Dòng 73: `createSimAsset` → thêm `'sim'`
2. Dòng 99: `updateSimAsset` → thêm `'sim'`
3. Dòng 123: `deleteSimAsset` → thêm `'sim'`
4. Dòng 153: `createSimLinkedAccount` → thêm `'sim'`
5. Dòng 179: `updateSimLinkedAccount` → thêm `'sim'`
6. Dòng 203: `deleteSimLinkedAccount` → thêm `'sim'`
7. Dòng 233: `createSimEmployee` → thêm `'sim'`
8. Dòng 253: `updateSimEmployee` → thêm `'sim'`
9. Dòng 281: `resolveSimRiskEvent` → thêm `'sim'`
10. Dòng 323: `dismissSimRiskEvent` → thêm `'sim'`
11. Dòng 357: `restoreSimRiskEvent` → thêm `'sim'`

**Ngoài ra có thêm 3 call sites KHÔNG có role array** (các batch imports):
12. Dòng 389: `addSimCheckLog` — `verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'])` → thêm `'sim'`
13. Dòng 430: `importSimAssetsBatch` — `verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'])` → thêm `'sim'`
14. Dòng 463: `importSimLinkedAccountsBatch` — `verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'])` → thêm `'sim'`

Tất cả 14 call sites đều giống nhau: thêm `'sim'` làm tham số thứ 3.

**Pattern sửa cho `AllowMultiple: true`:**
```
Target:  verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'])
Replace: verifyTeamAccess(teamId, ['owner', 'admin', 'manager', 'member'], 'sim')
```

### 3.5. Vùng CẤM (trong task này)
- KHÔNG đụng: hàm `sanitizeError` (dòng 53-65)
- KHÔNG đụng: logic nghiệp vụ bên trong các hàm CRUD (insert/update/delete statements)
- KHÔNG đổi tên hàm `verifyTeamAccess`
- KHÔNG thay đổi kiểu trả về `{ user, membership }`

### 3.6. Phụ thuộc
Không — Task này độc lập (có thể làm song song với Task 1 và 2).

### 3.7. Verification (Cách kiểm tra đúng/sai)
1. `pnpm build` — phải compile thành công 0 errors
2. Grep `requiredApp` trong `sim-actions.ts` — phải xuất hiện tại signature `verifyTeamAccess`
3. Grep `'sim'` trong `sim-actions.ts` — phải xuất hiện ≥14 lần (14 call sites)
4. Grep `activatedApps` trong `sim-actions.ts` — phải xuất hiện 1 lần (trong `verifyTeamAccess`)

### 3.8. Kết quả mong đợi
- Khi SIM Manager bị hủy kích hoạt (không có `'sim'` trong `teams.activatedApps`), mọi thao tác ghi SIM data đều trả về lỗi `{ success: false, error: 'Ứng dụng chưa được kích hoạt trong không gian làm việc này' }`
- Khi SIM Manager đang kích hoạt, mọi thao tác hoạt động bình thường như trước
- Pattern `requiredApp` có thể tái sử dụng cho các MVP khác (Chat, API Hub...) trong tương lai

---

## THỨ TỰ THỰC HIỆN

```
Task 1 (actions.ts - Soft Delete)
    ↓
Task 2 (queries.ts - Lọc deletedAt) — phải SAU Task 1
    ↓
Task 3 (sim-actions.ts - App Gating) — độc lập, có thể song song với Task 1+2
```

**Khuyến nghị**: Làm tuần tự 1 → 2 → 3 rồi build 1 lần cuối cùng.

## SAU KHI HOÀN TẤT
- Cập nhật START.md: Ghi nhận "✅ Hoàn thành Soft-Delete Workspace & App Activation Gating"
- Cập nhật UI_MAP.md: KHÔNG cần (không thay đổi UI)
- Cập nhật LESSONS.md: Đề xuất thêm bài học mới về "Soft-Delete vs Hard-Delete" nếu chưa có
