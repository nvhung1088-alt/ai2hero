'use server';

import { z } from 'zod';
import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewUser,
  type NewTeam,
  type NewTeamMember,
  type NewActivityLog,
  ActivityType,
  invitations,
  notifications,
  feedPosts,
  feedComments,
  feedLikes,
  feedCommentLikes,
  feedBookmarks,
  feedStories,
  systemSettings,
  socialGroups,
  socialGroupMembers,
  socialPages,
  socialPageFollowers
} from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { comparePasswords, hashPassword } from '@/lib/auth/password';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam, getSystemSetting, updateSystemSetting, DEFAULT_BILLING_PLANS, getFeedPosts } from '@/lib/db/queries';
import { createNotification, createInviteNotification } from '@/lib/db/notification-actions';
import { requireTeamRole, assertMemberInTeam } from '@/lib/db/workspace-helpers';
import { type TeamMember } from '@/lib/db/schema';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await db.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return {
      error: 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.',
      email
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  // Chặn đăng nhập mật khẩu nếu tài khoản đăng ký bằng Google
  if (foundUser.googleId && (!foundUser.passwordHash || foundUser.passwordHash === '')) {
    return {
      error: 'Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng Google.',
      email
    };
  }

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.',
      email
    };
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId });
  }

  redirect('/');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional()
});

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    const isGoogleUser = existingUser[0].googleId && (!existingUser[0].passwordHash || existingUser[0].passwordHash === '');
    return {
      error: isGoogleUser
        ? 'Email này đã được đăng ký bằng Google. Vui lòng quay lại đăng nhập bằng Google.'
        : 'Email này đã được sử dụng. Vui lòng sử dụng email khác.',
      email
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser: NewUser = {
    email,
    passwordHash,
    role: 'owner' // Default role, will be overridden if there's an invitation
  };

  const [createdUser] = await db.insert(users).values(newUser).returning();

  if (!createdUser) {
    return {
      error: 'Failed to create user. Please try again.',
      email
    };
  }

  let teamId: number;
  let userRole: string;
  let createdTeam: typeof teams.$inferSelect | null = null;

  if (inviteId) {
    // Check if there's a valid invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, parseInt(inviteId)),
          eq(invitations.email, email),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (invitation) {
      teamId = invitation.teamId;
      userRole = invitation.role;

      await db
        .update(invitations)
        .set({ status: 'accepted' })
        .where(eq(invitations.id, invitation.id));

      await logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);

      [createdTeam] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1);
    } else {
      return { error: 'Invalid or expired invitation.', email };
    }
  } else {
    // Create a new team if there's no invitation
    const newTeam: NewTeam = {
      name: `${email}'s Team`,
      activatedApps: ['hero-social']
    };

    [createdTeam] = await db.insert(teams).values(newTeam).returning();

    if (!createdTeam) {
      return {
        error: 'Failed to create team. Please try again.',
        email
      };
    }

    teamId = createdTeam.id;
    userRole = 'owner';

    await logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM);
  }

  const newTeamMember: NewTeamMember = {
    userId: createdUser.id,
    teamId: teamId,
    role: userRole
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
    setSession(createdUser)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: createdTeam, priceId });
  }

  redirect('/');
});

export async function signOut() {
  const user = (await getUser()) as User;
  if (!user) {
    (await cookies()).delete('session');
    return;
  }
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'Current password is incorrect.'
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password must be different from the current password.'
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: 'New password and confirmation password do not match.'
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: 'Password updated successfully.'
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: 'Incorrect password. Account deletion failed.'
      };
    }

    // P1: Quét toàn bộ workspace memberships của user
    const allMemberships = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id));

    // P1: Chặn xóa nếu user là Owner duy nhất của bất kỳ workspace nào
    for (const membership of allMemberships) {
      if (membership.role === 'owner') {
        const ownerCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(teamMembers)
          .where(and(
            eq(teamMembers.teamId, membership.teamId),
            eq(teamMembers.role, 'owner')
          ));
        
        if ((ownerCountResult[0]?.count ?? 0) <= 1) {
          return {
            password,
            error: 'Bạn là Chủ sở hữu duy nhất của một không gian làm việc. Hãy chuyển quyền hoặc xóa không gian đó trước khi xóa tài khoản.'
          };
        }
      }
    }

    // P1: Log activity cho tất cả các workspace, xóa user khỏi tất cả
    for (const membership of allMemberships) {
      await logActivity(membership.teamId, user.id, ActivityType.DELETE_ACCOUNT);
    }

    // P1: Xóa user khỏi toàn bộ team memberships (cascade delete)
    await db
      .delete(teamMembers)
      .where(eq(teamMembers.userId, user.id));

    // Soft delete user account
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db.update(users).set({ name, email }).where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);

    return { name, success: 'Account updated successfully.' };
  }
);

// Legacy removeTeamMember and inviteTeamMember removed as they have 0 call sites.

const updateBillingPlansSchema = z.object({
  plansJson: z.string()
});

export const updateBillingPlans = validatedActionWithUser(
  updateBillingPlansSchema,
  async (data, _, user) => {
    if (user.role !== 'super_admin') {
      return { error: 'Quyền truy cập bị từ chối. Chỉ dành cho Super Admin.' };
    }

    try {
      const plans = JSON.parse(data.plansJson);
      if (!Array.isArray(plans)) {
        return { error: 'Dữ liệu phải là một mảng cấu hình gói cước.' };
      }
      await updateSystemSetting('BILLING_PLANS', plans);
      return { success: 'Đã cập nhật cấu hình bảng giá thành công!' };
    } catch (e) {
      return { error: 'Dữ liệu JSON không hợp lệ.' };
    }
  }
);

export async function getBillingPlans() {
  return await getSystemSetting('BILLING_PLANS');
}

export async function createWorkspaceAction(data: { name: string; avatar?: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { name, avatar } = data;
  if (!name || name.trim().length === 0) {
    return { error: 'Tên không gian làm việc là bắt buộc' };
  }

  // === WORKSPACE LIMIT GATING (R-01) ===
  // 1. Đếm số không gian làm việc hiện tại mà user sở hữu (role='owner', chưa bị soft-delete)
  const ownedTeamMemberships = await db
    .select({ teamId: teamMembers.teamId, planName: teams.planName })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teamMembers.userId, user.id),
        eq(teamMembers.role, 'owner'),
        isNull(teams.deletedAt)
      )
    );

  const ownedCount = ownedTeamMemberships.length;

  // 2. Xác định giới hạn từ BILLING_PLANS — lấy plan tốt nhất (highest maxOwnedWorkspaces)
  const billingPlans = (await getSystemSetting('BILLING_PLANS')) as any[];
  let bestMaxWorkspaces = 1; // fallback Free

  if (Array.isArray(billingPlans)) {
    for (const membership of ownedTeamMemberships) {
      const planId = (membership.planName || 'free').toLowerCase();
      const matchedPlan = billingPlans.find((p: any) => p.id === planId);
      const defaultPlan = DEFAULT_BILLING_PLANS.find((dp: any) => dp.id === planId);
      const maxWs = matchedPlan?.maxOwnedWorkspaces ?? defaultPlan?.maxOwnedWorkspaces ?? 1;
      if (maxWs > bestMaxWorkspaces) bestMaxWorkspaces = maxWs;
    }
    // Nếu user chưa sở hữu workspace nào → dùng default Free plan
    if (ownedTeamMemberships.length === 0) {
      const freePlan = billingPlans.find((p: any) => p.id === 'free');
      const defaultFreePlan = DEFAULT_BILLING_PLANS.find((dp: any) => dp.id === 'free');
      bestMaxWorkspaces = freePlan?.maxOwnedWorkspaces ?? defaultFreePlan?.maxOwnedWorkspaces ?? 1;
    }
  }

  if (ownedCount >= bestMaxWorkspaces) {
    return {
      error: `Bạn đã đạt giới hạn ${bestMaxWorkspaces} không gian làm việc cho gói hiện tại. Vui lòng nâng cấp gói cước để tạo thêm.`
    };
  }
  // === END GATING ===
  
  const [createdTeam] = await db
    .insert(teams)
    .values({
      name,
      avatar: avatar || '💼',
      planName: 'free'
    })
    .returning();

  if (!createdTeam) {
    return { error: 'Không thể tạo không gian làm việc mới.' };
  }

  const newTeamMember: NewTeamMember = {
    userId: user.id,
    teamId: createdTeam.id,
    role: 'owner'
  };

  await Promise.all([
    db.insert(teamMembers).values(newTeamMember),
    logActivity(createdTeam.id, user.id, ActivityType.CREATE_TEAM)
  ]);

  return { success: 'Đã tạo không gian làm việc thành công.', teamId: createdTeam.id };
}

export async function updateWorkspaceAction(data: { teamId: number; name: string; avatar?: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { teamId, name, avatar } = data;
  if (!name || name.trim().length === 0) {
    return { error: 'Tên không gian làm việc là bắt buộc' };
  }

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ dành cho Chủ sở hữu hoặc Quản trị viên.' };
  }

  await db
    .update(teams)
    .set({
      name,
      avatar: avatar || '💼',
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));

  return { success: 'Đã cập nhật không gian làm việc thành công.' };
}

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

  return { success: 'Đã xóa không gian làm việc thành công.' };
}

export async function activateAppAction(data: { teamId: number; appId: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { teamId, appId } = data;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ dành cho Chủ sở hữu hoặc Quản trị viên.' };
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
    .limit(1);

  if (!team) {
    return { error: 'Không tìm thấy không gian làm việc hoặc không gian làm việc đã bị xóa.' };
  }

  // === BILLING_PLANS GATING (Server-side) ===
  // Chặn kích hoạt app không nằm trong danh sách allowedApps của gói cước hiện tại
  const billingPlans = await getSystemSetting('BILLING_PLANS');
  const teamPlanName = team.planName || 'free';
  const currentPlan = Array.isArray(billingPlans)
    ? billingPlans.find((p: any) => p.id === teamPlanName)
    : null;
  const allowedApps: string[] = currentPlan?.allowedApps ?? [];

  if (allowedApps.length > 0 && !allowedApps.includes(appId)) {
    return {
      error: `Ứng dụng "${appId}" không khả dụng cho gói ${currentPlan?.name || teamPlanName}. Vui lòng nâng cấp gói cước để sử dụng.`
    };
  }
  // === END GATING ===

  const currentApps = Array.isArray(team.activatedApps) ? (team.activatedApps as string[]) : [];
  if (currentApps.includes(appId)) {
    return { error: 'Ứng dụng đã được kích hoạt sẵn trong không gian làm việc này.' };
  }

  const updatedApps = [...currentApps, appId];

  await db
    .update(teams)
    .set({
      activatedApps: updatedApps,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));

  await logActivity(teamId, user.id, `ACTIVATE_APP:${appId}` as any);

  return { success: 'Kích hoạt ứng dụng thành công!' };
}

export async function deactivateAppAction(data: { teamId: number; appId: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { teamId, appId } = data;

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!member || member.role !== 'owner') {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu mới có quyền hủy kích hoạt ứng dụng.' };
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
    .limit(1);

  if (!team) {
    return { error: 'Không tìm thấy không gian làm việc hoặc không gian làm việc đã bị xóa.' };
  }

  const currentApps = Array.isArray(team.activatedApps) ? (team.activatedApps as string[]) : [];
  const updatedApps = currentApps.filter(id => id !== appId);

  await db
    .update(teams)
    .set({
      activatedApps: updatedApps,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));

  await logActivity(teamId, user.id, `DEACTIVATE_APP:${appId}` as any);

  return { success: 'Hủy kích hoạt ứng dụng thành công!' };
}

export async function createFeedPostAction(data: {
  type: 'mvp_result' | 'task_assignment' | 'system_activity' | 'news' | 'product' | 'article';
  teamIdString?: string | null;
  message: string;
  mentions?: string[];
  attachments?: any[];
  syncWebsite?: boolean;
  websiteCategory?: string;
  taggedProducts?: any[];
  appId?: string;
  resultPreview?: string;
  resultMetrics?: any[];
  taskTitle?: string;
  taskAssignee?: string;
  taskDueDate?: string;
  sharedPostId?: number;
  visibility?: 'public' | 'friends' | 'private';
}) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const {
    type,
    teamIdString,
    message,
    mentions,
    attachments,
    syncWebsite,
    websiteCategory,
    taggedProducts,
    appId,
    resultPreview,
    resultMetrics,
    taskTitle,
    taskAssignee,
    taskDueDate,
    sharedPostId,
    visibility
  } = data;

  if (!message || message.trim().length === 0) {
    return { error: 'Nội dung bài viết không được trống.' };
  }

  let teamId: number | null = null;
  let pageId: number | null = null;
  let groupId: number | null = null;

  if (teamIdString) {
    if (teamIdString.startsWith('team-')) {
      teamId = parseInt(teamIdString.slice(5), 10);
    } else if (teamIdString.startsWith('page-')) {
      pageId = parseInt(teamIdString.slice(5), 10);
    } else if (teamIdString.startsWith('group-')) {
      groupId = parseInt(teamIdString.slice(6), 10);
    }
  }

  if (!teamId && !pageId && !groupId) {
    const userWithTeam = await getUserWithTeam(user.id);
    teamId = userWithTeam?.teamId || null;
  }

  if (!teamId && !pageId && !groupId) {
    return { error: 'Không tìm thấy đích đến cho bài đăng.' };
  }

  const [newPost] = await db
    .insert(feedPosts)
    .values({
      teamId,
      pageId,
      groupId,
      userId: user.id,
      type,
      message,
      mentions: mentions || [],
      attachments: attachments || [],
      syncWebsite: syncWebsite ? 1 : 0,
      websiteCategory,
      taggedProducts: taggedProducts || [],
      appId,
      resultPreview,
      resultMetrics: resultMetrics || [],
      taskTitle,
      taskStatus: type === 'task_assignment' ? 'pending' : undefined,
      taskAssignee,
      taskDueDate,
      pinned: 0,
      sharedPostId,
      visibility: visibility || 'public'
    })
    .returning();

  if (!newPost) {
    return { error: 'Không thể xuất bản bài đăng.' };
  }

  if (teamId) {
    await logActivity(teamId, user.id, `CREATE_FEED_POST:${newPost.id}` as any);
  }

  // Tạo thông báo giao việc Bell động cho Assignee
  if (type === 'task_assignment' && taskAssignee) {
    const [assignee] = await db.select().from(users).where(eq(users.name, taskAssignee)).limit(1);
    if (assignee && assignee.id !== user.id) {
      await createNotification(
        assignee.id,
        user.id,
        user.name || 'Hero',
        '🦸‍♂️',
        `đã giao cho bạn nhiệm vụ: "${taskTitle}"`,
        newPost.id
      );
    }
  }

  return { success: 'Đăng bài thành công!', postId: newPost.id };
}

export async function loadMoreFeedAction(activeTeamId: number | undefined, cursor: number | undefined, limitNum: number = 10) {
  const user = await getUser();
  if (!user) return { error: 'Không được phép' };
  try {
    const userTeamIds = activeTeamId ? [activeTeamId] : [];
    const posts = await getFeedPosts(userTeamIds, cursor, limitNum);
    return { success: true, posts };
  } catch (e: any) {
    console.error(e);
    return { error: e.message };
  }
}

export async function toggleFeedLikeAction(data: { postId: number; reactionType?: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId, reactionType = 'like' } = data;

  const [existingLike] = await db
    .select()
    .from(feedLikes)
    .where(and(eq(feedLikes.postId, postId), eq(feedLikes.userId, user.id)))
    .limit(1);

  if (existingLike) {
    if (existingLike.reactionType === reactionType) {
      await db.delete(feedLikes).where(eq(feedLikes.id, existingLike.id));
      return { success: 'Đã bỏ thích bài đăng', liked: false, reactionType: null };
    } else {
      await db.update(feedLikes).set({ reactionType }).where(eq(feedLikes.id, existingLike.id));
      return { success: 'Đã cập nhật cảm xúc bài đăng', liked: true, reactionType };
    }
  } else {
    await db.insert(feedLikes).values({
      postId,
      userId: user.id,
      reactionType
    });
    
    // Tạo thông báo Bell động cho tác giả bài viết
    const [post] = await db.select().from(feedPosts).where(eq(feedPosts.id, postId)).limit(1);
    if (post && post.userId !== user.id) {
      await createNotification(
        post.userId,
        user.id,
        user.name || 'Hero',
        '🦸‍♂️',
        'đã thích bài viết của bạn',
        postId
      );
    }
    
    return { success: 'Đã thích bài đăng', liked: true, reactionType };
  }
}

export async function toggleFeedCommentLikeAction(data: { commentId: number; reactionType?: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { commentId, reactionType = 'like' } = data;

  const [existingLike] = await db
    .select()
    .from(feedCommentLikes)
    .where(and(eq(feedCommentLikes.commentId, commentId), eq(feedCommentLikes.userId, user.id)))
    .limit(1);

  if (existingLike) {
    if (existingLike.reactionType === reactionType) {
      await db.delete(feedCommentLikes).where(eq(feedCommentLikes.id, existingLike.id));
      return { success: 'Đã bỏ thích bình luận', liked: false, reactionType: null };
    } else {
      await db.update(feedCommentLikes).set({ reactionType }).where(eq(feedCommentLikes.id, existingLike.id));
      return { success: 'Đã cập nhật cảm xúc bình luận', liked: true, reactionType };
    }
  } else {
    await db.insert(feedCommentLikes).values({
      commentId,
      userId: user.id,
      reactionType
    });
    return { success: 'Đã thích bình luận', liked: true, reactionType };
  }
}

export async function addFeedCommentAction(data: { postId: number; content: string; parentId?: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId, content, parentId } = data;
  if (!content || content.trim().length === 0) {
    return { error: 'Nội dung bình luận không được trống.' };
  }

  const [newComment] = await db
    .insert(feedComments)
    .values({
      postId,
      userId: user.id,
      userName: user.name || 'Hero',
      userAvatar: '🦸‍♂️',
      content: content.trim(),
      parentId: parentId || null
    })
    .returning();

  if (!newComment) {
    return { error: 'Không thể thêm bình luận.' };
  }

  // Tạo thông báo Bell động cho tác giả bài viết
  const [post] = await db.select().from(feedPosts).where(eq(feedPosts.id, postId)).limit(1);
  if (post && post.userId !== user.id) {
    await createNotification(
      post.userId,
      user.id,
      user.name || 'Hero',
      '🦸‍♂️',
      `đã bình luận về bài viết của bạn: "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`,
      postId
    );
  }

  return { success: 'Đã thêm bình luận thành công!', comment: newComment };
}

export async function getFeedCommentsAction(postId: number) {
  const user = await getUser();
  if (!user) return [];

  const comments = await db.query.feedComments.findMany({
    where: eq(feedComments.postId, postId),
    orderBy: [desc(feedComments.createdAt)],
  });

  return comments;
}

export async function toggleFeedPinAction(data: { postId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId } = data;

  const [post] = await db
    .select()
    .from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'Bài đăng không tồn tại.' };
  }

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, post.teamId!), eq(teamMembers.userId, user.id)))
    .limit(1);

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ dành cho Chủ sở hữu hoặc Quản trị viên.' };
  }

  const nextPinned = post.pinned === 1 ? 0 : 1;

  if (nextPinned === 1) {
    await db
      .update(feedPosts)
      .set({ pinned: 0, pinnedBy: null })
      .where(eq(feedPosts.teamId, post.teamId!));
    
    await db
      .update(feedPosts)
      .set({ pinned: 1, pinnedBy: user.name || 'Hero' })
      .where(eq(feedPosts.id, postId));
  } else {
    await db
      .update(feedPosts)
      .set({ pinned: 0, pinnedBy: null })
      .where(eq(feedPosts.id, postId));
  }

  return { success: nextPinned === 1 ? 'Đã ghim bài viết thành công!' : 'Đã bỏ ghim bài viết!', pinned: nextPinned === 1 };
}

export async function editFeedPostAction(data: { postId: number; message: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId, message } = data;
  if (!message || message.trim().length === 0) {
    return { error: 'Nội dung bài viết không được trống.' };
  }

  const [post] = await db
    .select()
    .from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'Bài đăng không tồn tại.' };
  }

  if (post.userId !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
    return { error: 'Quyền truy cập bị từ chối. Chỉ tác giả mới có quyền sửa bài viết này.' };
  }

  await db
    .update(feedPosts)
    .set({
      message: message.trim(),
      updatedAt: new Date()
    })
    .where(eq(feedPosts.id, postId));

  return { success: 'Đã sửa bài viết thành công!' };
}

export async function deleteFeedPostAction(data: { postId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId } = data;

  const [post] = await db
    .select()
    .from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'Bài đăng không tồn tại.' };
  }

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, post.teamId!), eq(teamMembers.userId, user.id)))
    .limit(1);

  const isOwner = post.userId === user.id;
  const isAdmin = member && (member.role === 'owner' || member.role === 'admin');

  if (!isOwner && !isAdmin && user.role !== 'super_admin') {
    return { error: 'Quyền truy cập bị từ chối. Bạn không có quyền xóa bài viết này.' };
  }

  // PostgreSQL CASCADE will handle comments and likes deletion.
  await db.delete(feedPosts).where(eq(feedPosts.id, postId));

  return { success: 'Đã xóa bài viết thành công!' };
}

export async function toggleBookmarkPostAction(data: { postId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId } = data;

  const [existingBookmark] = await db
    .select()
    .from(feedBookmarks)
    .where(and(eq(feedBookmarks.postId, postId), eq(feedBookmarks.userId, user.id)))
    .limit(1);

  if (existingBookmark) {
    await db.delete(feedBookmarks).where(eq(feedBookmarks.id, existingBookmark.id));
    return { success: 'Đã bỏ lưu bài viết', saved: false };
  } else {
    await db.insert(feedBookmarks).values({
      postId,
      userId: user.id
    });
    return { success: 'Đã lưu bài viết thành công', saved: true };
  }
}

export async function changeTaskStatusAction(data: { postId: number; status: 'pending' | 'in_progress' | 'completed' }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId, status } = data;

  const [post] = await db
    .select()
    .from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);

  if (!post || post.type !== 'task_assignment') {
    return { error: 'Nhiệm vụ không tồn tại.' };
  }

  await db
    .update(feedPosts)
    .set({
      taskStatus: status,
      updatedAt: new Date()
    })
    .where(eq(feedPosts.id, postId));

  // Tạo thông báo cập nhật trạng thái nhiệm vụ cho người giao việc
  if (post.userId !== user.id) {
    const statusText = status === 'completed' ? 'hoàn thành' : status === 'in_progress' ? 'bắt đầu thực hiện' : 'hoãn';
    await createNotification(
      post.userId,
      user.id,
      user.name || 'Hero',
      '🦸‍♂️',
      `đã ${statusText} nhiệm vụ: "${post.taskTitle}"`,
      postId
    );
  }

  return { success: 'Đã cập nhật trạng thái nhiệm vụ thành công!', status };
}

export async function changeMemberRoleAction(data: { memberId: number; role: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { memberId, role } = data;

  const [targetMember] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);

  if (!targetMember) {
    return { error: 'Không tìm thấy thành viên.' };
  }

  // Check current user's role in the same team
  const [currentUserMember] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, targetMember.teamId)))
    .limit(1);

  if (!currentUserMember || (currentUserMember.role !== 'owner' && currentUserMember.role !== 'admin')) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ dành cho Chủ sở hữu hoặc Quản trị viên.' };
  }

  // Cannot modify owner's role unless you are the owner
  if (targetMember.role === 'owner') {
    if (currentUserMember.role !== 'owner') {
      return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu mới được thay đổi vai trò của Chủ sở hữu.' };
    }
    
    // Prevent last owner from downgrading their role
    if (role !== 'owner') {
      const ownerCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, targetMember.teamId), eq(teamMembers.role, 'owner')));
      
      if ((ownerCountResult[0]?.count ?? 0) <= 1) {
        return { error: 'Không thể hạ cấp vai trò Chủ sở hữu duy nhất. Hãy chuyển quyền cho người khác trước.' };
      }
    }
  }

  await db
    .update(teamMembers)
    .set({ role })
    .where(eq(teamMembers.id, memberId));

  await logActivity(targetMember.teamId, user.id, `CHANGE_MEMBER_ROLE:${targetMember.userId}` as any);

  return { success: 'Thay đổi vai trò thành công!' };
}

export async function cancelInvitationAction(data: { invitationId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { invitationId } = data;

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1);

  if (!invitation) {
    return { error: 'Không tìm thấy lời mời.' };
  }

  // Check current user's role in the team
  const [currentUserMember] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, invitation.teamId)))
    .limit(1);

  if (!currentUserMember || (currentUserMember.role !== 'owner' && currentUserMember.role !== 'admin')) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ dành cho Chủ sở hữu hoặc Quản trị viên.' };
  }

  await db
    .delete(invitations)
    .where(eq(invitations.id, invitationId));

  await logActivity(invitation.teamId, user.id, `CANCEL_INVITATION:${invitation.email}` as any);

  return { success: 'Hủy lời mời thành công!' };
}

export async function inviteTeamMemberAction(data: { email: string; role: string; teamId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const email = data.email.trim().toLowerCase();
  const { role, teamId } = data;

  if (!teamId) {
    return { error: 'Thiếu teamId. Vui lòng tải lại trang.' };
  }

  // Authenticate + Authorize user role
  let actor: TeamMember;
  try {
    actor = await requireTeamRole(user.id, teamId, ['owner', 'admin']);
  } catch {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu hoặc Quản trị viên mới có quyền mời thành viên.' };
  }

  // Check member limits
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) return { error: 'Không tìm thấy nhóm.' };

  const currentMembers = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  const currentInvitations = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.teamId, teamId), eq(invitations.status, 'pending')));

  const totalActiveSlots = currentMembers.length + currentInvitations.length;
  const billingPlans = (await getSystemSetting('BILLING_PLANS')) as any[];
  const activePlan = billingPlans?.find(
    (p: any) => p.name.toLowerCase() === (team.planName || 'free').toLowerCase()
  ) || billingPlans?.[0];

  const maxMembers = activePlan?.maxMembers ?? 1;

  if (totalActiveSlots >= maxMembers) {
    return {
      error: `Vượt quá giới hạn thành viên cho gói ${activePlan?.name || 'Free'} (Tối đa ${maxMembers} người). Vui lòng nâng cấp gói cước.`
    };
  }

  // Check if already member
  const existingMember = await db
    .select()
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(and(eq(users.email, email), eq(teamMembers.teamId, teamId)))
    .limit(1);

  if (existingMember.length > 0) {
    return { error: 'Người dùng này đã là thành viên của nhóm.' };
  }

  // Check if invitation sent
  const existingInvitation = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.email, email), eq(invitations.teamId, teamId), eq(invitations.status, 'pending')))
    .limit(1);

  if (existingInvitation.length > 0) {
    return { error: 'Một lời mời khác đã được gửi tới email này và đang chờ duyệt.' };
  }

  const [newInvitation] = await db.insert(invitations).values({
    teamId,
    email,
    role,
    invitedBy: user.id,
    status: 'pending'
  }).returning();

  if (newInvitation) {
    // Kiểm tra xem email này đã đăng ký tài khoản chưa
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      await createInviteNotification(
        existingUser.id,
        user.id,
        user.name || user.email,
        team.name,
        newInvitation.id
      );
    }
  }

  await logActivity(teamId, user.id, ActivityType.INVITE_TEAM_MEMBER);

  return { success: 'Đã gửi lời mời thành công!' };
}

export async function removeTeamMemberAction(data: { memberId: number; teamId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { memberId, teamId } = data;
  if (!teamId) {
    return { error: 'Thiếu teamId. Vui lòng tải lại trang.' };
  }

  // Authorize actor: allow any valid member role first, then filter specific permissions
  let actor: TeamMember;
  try {
    actor = await requireTeamRole(user.id, teamId, ['owner', 'admin', 'member', 'staff', 'viewer']);
  } catch {
    return { error: 'Quyền truy cập bị từ chối.' };
  }

  // Verify target member belongs to the same teamId to prevent cross-team spoofing
  let targetMember: TeamMember;
  try {
    targetMember = await assertMemberInTeam(memberId, teamId);
  } catch {
    return { error: 'Không tìm thấy thành viên.' };
  }

  const isSelf = targetMember.userId === user.id;
  const isOwnerOrAdmin = actor.role === 'owner' || actor.role === 'admin';

  if (!isSelf && !isOwnerOrAdmin) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu hoặc Quản trị viên mới được phép xóa thành viên.' };
  }

  // Owner protection rules
  if (targetMember.role === 'owner') {
    if (!isSelf) {
      return { error: 'Không thể xóa Chủ sở hữu nhóm.' };
    }
    // If self-leaving, ensure there's at least one other owner in the team
    const ownerCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, 'owner')));
    
    if ((ownerCountResult[0]?.count ?? 0) <= 1) {
      return { error: 'Bạn là Chủ sở hữu duy nhất. Hãy chuyển quyền trước khi rời.' };
    }
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)));

  await logActivity(teamId, user.id, ActivityType.REMOVE_TEAM_MEMBER);

  return { success: 'Đã xóa thành viên thành công.' };
}

export async function acceptInvitationAction(data: { invitationId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { invitationId } = data;

  // 1. Tìm invitation đang pending
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.status, 'pending')))
    .limit(1);

  if (!invitation) {
    return { error: 'Không tìm thấy lời mời hoặc lời mời đã hết hạn/được xử lý.' };
  }

  // 2. Kiểm tra email của user có trùng với email lời mời không
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: 'Lời mời này không dành cho tài khoản của bạn.' };
  }

  // 3-5. Atomic transaction: Thêm member + cập nhật invitation + đánh dấu thông báo
  await db.transaction(async (tx) => {
    const [existingMember] = await tx
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, invitation.teamId)))
      .limit(1);

    if (!existingMember) {
      await tx.insert(teamMembers).values({
        userId: user.id,
        teamId: invitation.teamId,
        role: invitation.role,
        joinedAt: new Date()
      });
    }

    await tx
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitationId));

    await tx
      .update(notifications)
      .set({ read: 1 })
      .where(and(eq(notifications.userId, user.id), eq(notifications.invitationId, invitationId)));
  });

  // 5. logActivity (side effect — ngoài transaction)
  await logActivity(invitation.teamId, user.id, ActivityType.ACCEPT_INVITATION);

  // 6. Gửi thông báo ngược lại cho người mời
  const [inviter] = await db
    .select()
    .from(users)
    .where(eq(users.id, invitation.invitedBy))
    .limit(1);

  if (inviter) {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, invitation.teamId))
      .limit(1);

    await createNotification(
      inviter.id,
      user.id,
      user.name || user.email,
      '👤',
      `đã chấp nhận lời mời tham gia nhóm "${team?.name || 'Workspace'}"`,
      null
    );
  }

  revalidatePath('/dashboard');
  return { success: 'Đã chấp nhận lời mời thành công!' };
}

export async function declineInvitationAction(data: { invitationId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { invitationId } = data;

  // 1. Tìm invitation đang pending
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.status, 'pending')))
    .limit(1);

  if (!invitation) {
    return { error: 'Không tìm thấy lời mời hoặc lời mời đã hết hạn/được xử lý.' };
  }

  // 2. Kiểm tra email của user có trùng với email lời mời không
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: 'Lời mời này không dành cho tài khoản của bạn.' };
  }

  // 3. Từ chối lời mời
  await db
    .update(invitations)
    .set({ status: 'rejected' })
    .where(eq(invitations.id, invitationId));

  // 4. Đánh dấu các thông báo liên quan đến invitation này là đã đọc
  await db
    .update(notifications)
    .set({ read: 1 })
    .where(and(eq(notifications.userId, user.id), eq(notifications.invitationId, invitationId)));

  // 5. Gửi thông báo ngược lại cho người mời
  const [inviter] = await db
    .select()
    .from(users)
    .where(eq(users.id, invitation.invitedBy))
    .limit(1);

  if (inviter) {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, invitation.teamId))
      .limit(1);

    await createNotification(
      inviter.id,
      user.id,
      user.name || user.email,
      '👤',
      `đã từ chối lời mời tham gia nhóm "${team?.name || 'Workspace'}"`,
      null
    );
  }

  revalidatePath('/dashboard');
  return { success: 'Đã từ chối lời mời.' };
}

export async function createFeedStoryAction(data: {
  teamIdString?: string | null;
  imageUrl?: string;
  textContent?: string;
  bgClass?: string;
}) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { teamIdString, imageUrl, textContent, bgClass } = data;

  if (!imageUrl && !textContent) {
    return { error: 'Story phải có nội dung chữ hoặc hình ảnh.' };
  }

  let teamId: number | null = null;
  if (teamIdString && teamIdString.startsWith('team-')) {
    teamId = parseInt(teamIdString.slice(5), 10);
  }

  if (!teamId) {
    const userWithTeam = await getUserWithTeam(user.id);
    teamId = userWithTeam?.teamId || null;
  }

  if (!teamId) {
    return { error: 'Không tìm thấy không gian làm việc tương ứng.' };
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Tự động hết hạn sau 24h

  const [newStory] = await db
    .insert(feedStories)
    .values({
      teamId,
      userId: user.id,
      imageUrl,
      textContent,
      bgClass,
      expiresAt
    })
    .returning();

  const serializedStory = {
    ...newStory,
    createdAt: newStory.createdAt.toISOString(),
    expiresAt: newStory.expiresAt.toISOString()
  };

  revalidatePath('/dashboard/home');
  revalidatePath('/');
  return { success: 'Đã thêm tin mới thành công!', story: serializedStory };
}

// ==========================================
// SHARE ACTIONS
// ==========================================

export async function getUserGroupsAndPagesAction() {
  const user = await getUser();
  if (!user) return { groups: [], pages: [] };

  const groups = await db
    .select({
      id: socialGroups.id,
      name: socialGroups.name,
      coverUrl: socialGroups.coverUrl,
    })
    .from(socialGroups)
    .innerJoin(socialGroupMembers, eq(socialGroupMembers.groupId, socialGroups.id))
    .where(and(eq(socialGroupMembers.userId, user.id), eq(socialGroupMembers.status, 'approved')));

  // user có thể share lên page mà họ owner
  const pages = await db
    .select({
      id: socialPages.id,
      name: socialPages.name,
      avatarUrl: socialPages.avatarUrl,
    })
    .from(socialPages)
    .where(eq(socialPages.ownerId, user.id));

  return { groups, pages };
}

export async function sharePostToFeedAction(data: {
  sharedPostId: number;
  message: string;
  groupId?: number | null;
  pageId?: number | null;
}) {
  const user = await getUser();
  if (!user) {
    return { error: 'Vui lòng đăng nhập.' };
  }

  const { sharedPostId, message, groupId, pageId } = data;

  const [teamMember] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  const teamId = teamMember ? teamMember.teamId : 1;

  try {
    const [newPost] = await db
      .insert(feedPosts)
      .values({
        teamId,
        userId: user.id,
        type: 'system_activity',
        message: message || '',
        sharedPostId,
        groupId: groupId || null,
        pageId: pageId || null,
      })
      .returning();

    return { success: 'Chia sẻ bài viết thành công!', post: newPost };
  } catch (error) {
    console.error('Error sharing post:', error);
    return { error: 'Không thể chia sẻ bài viết lúc này.' };
  }
}
