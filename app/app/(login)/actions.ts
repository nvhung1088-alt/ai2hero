'use server';

import { z } from 'zod';
import { and, eq, isNull, sql } from 'drizzle-orm';
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
  feedPosts,
  feedComments,
  feedLikes
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam, getSystemSetting, updateSystemSetting, DEFAULT_BILLING_PLANS } from '@/lib/db/queries';
import { createNotification } from '@/lib/db/notification-actions';
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
      error: 'Invalid email or password. Please try again.',
      email
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: 'Invalid email or password. Please try again.',
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

  redirect('/dashboard');
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
    return {
      error: 'Failed to create user. Please try again.',
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
      name: `${email}'s Team`
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

  redirect('/dashboard');
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

    const userWithTeam = await getUserWithTeam(user.id);

    await logActivity(
      userWithTeam?.teamId,
      user.id,
      ActivityType.DELETE_ACCOUNT
    );

    // Soft delete
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));

    if (userWithTeam?.teamId) {
      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.userId, user.id),
            eq(teamMembers.teamId, userWithTeam.teamId)
          )
        );
    }

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

const removeTeamMemberSchema = z.object({
  memberId: z.number()
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    // Check current user's role in the team
    const [currentUserMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      )
      .limit(1);

    const [targetMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);

    if (!targetMember) {
      return { error: 'Member not found' };
    }

    // Only Owner or Admin can remove members, or a user can remove themselves
    const isSelf = targetMember.userId === user.id;
    const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

    if (!isSelf && !isOwnerOrAdmin) {
      return { error: 'Unauthorized. Only owners and admins can remove team members.' };
    }

    // Cannot remove the owner of the team
    if (targetMember.role === 'owner' && !isSelf) {
      return { error: 'Cannot remove the team owner' };
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      );

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.REMOVE_TEAM_MEMBER
    );

    return { success: 'Team member removed successfully' };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: 'User is not part of a team' };
    }

    // Check if current user is owner or admin
    const [currentUserMember] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, user.id),
          eq(teamMembers.teamId, userWithTeam.teamId)
        )
      )
      .limit(1);

    const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

    if (!isOwnerOrAdmin) {
      return { error: 'Unauthorized. Only owners and admins can invite team members.' };
    }

    // Check member limits based on system settings and active plan
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, userWithTeam.teamId))
      .limit(1);

    if (!team) {
      return { error: 'Team not found' };
    }

    const currentMembers = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, userWithTeam.teamId));

    const currentInvitations = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      );

    const totalActiveSlots = currentMembers.length + currentInvitations.length;
    const billingPlans = (await getSystemSetting('BILLING_PLANS')) as any[];
    const activePlan =
      billingPlans?.find(
        (p: any) =>
          p.name.toLowerCase() === (team.planName || 'free').toLowerCase()
      ) || billingPlans?.[0];

    const maxMembers = activePlan?.maxMembers ?? 1;

    if (totalActiveSlots >= maxMembers) {
      return {
        error: `Vượt quá giới hạn thành viên cho gói ${activePlan?.name || 'Free'} (Tối đa ${maxMembers} người). Vui lòng nâng cấp gói cước.`
      };
    }

    const existingMember = await db
      .select()
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(eq(users.email, email), eq(teamMembers.teamId, userWithTeam.teamId))
      )
      .limit(1);

    if (existingMember.length > 0) {
      return { error: 'User is already a member of this team' };
    }

    // Check if there's an existing invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, userWithTeam.teamId),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { error: 'An invitation has already been sent to this email' };
    }

    // Create a new invitation
    await db.insert(invitations).values({
      teamId: userWithTeam.teamId,
      email,
      role,
      invitedBy: user.id,
      status: 'pending'
    });

    await logActivity(
      userWithTeam.teamId,
      user.id,
      ActivityType.INVITE_TEAM_MEMBER
    );

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return { success: 'Invitation sent successfully' };
  }
);

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
  type: 'mvp_result' | 'task_assignment' | 'system_activity' | 'news';
  teamIdString?: string | null;
  message: string;
  mentions?: string[];
  attachments?: any[];
  appId?: string;
  resultPreview?: string;
  resultMetrics?: any[];
  taskTitle?: string;
  taskAssignee?: string;
  taskDueDate?: string;
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
    appId,
    resultPreview,
    resultMetrics,
    taskTitle,
    taskAssignee,
    taskDueDate
  } = data;

  if (!message || message.trim().length === 0) {
    return { error: 'Nội dung bài viết không được trống.' };
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

  const [newPost] = await db
    .insert(feedPosts)
    .values({
      teamId,
      userId: user.id,
      type,
      message,
      mentions: mentions || [],
      attachments: attachments || [],
      appId,
      resultPreview,
      resultMetrics: resultMetrics || [],
      taskTitle,
      taskStatus: type === 'task_assignment' ? 'pending' : undefined,
      taskAssignee,
      taskDueDate,
      pinned: 0
    })
    .returning();

  if (!newPost) {
    return { error: 'Không thể xuất bản bài đăng.' };
  }

  await logActivity(teamId, user.id, `CREATE_FEED_POST:${newPost.id}` as any);

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

export async function toggleFeedLikeAction(data: { postId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId } = data;

  const [existingLike] = await db
    .select()
    .from(feedLikes)
    .where(and(eq(feedLikes.postId, postId), eq(feedLikes.userId, user.id)))
    .limit(1);

  if (existingLike) {
    await db.delete(feedLikes).where(eq(feedLikes.id, existingLike.id));
    return { success: 'Đã bỏ thích bài đăng', liked: false };
  } else {
    await db.insert(feedLikes).values({
      postId,
      userId: user.id
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
    
    return { success: 'Đã thích bài đăng', liked: true };
  }
}

export async function addFeedCommentAction(data: { postId: number; content: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { postId, content } = data;
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
      content: content.trim()
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
  if (targetMember.role === 'owner' && currentUserMember.role !== 'owner') {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu mới được thay đổi vai trò của Chủ sở hữu.' };
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

export async function inviteTeamMemberAction(data: { email: string; role: string }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { email, role } = data;
  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return { error: 'Bạn không thuộc về nhóm nào.' };
  }

  const teamId = userWithTeam.teamId;

  // Check role
  const [currentUserMember] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)))
    .limit(1);

  if (!currentUserMember || (currentUserMember.role !== 'owner' && currentUserMember.role !== 'admin')) {
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

  await db.insert(invitations).values({
    teamId,
    email,
    role,
    invitedBy: user.id,
    status: 'pending'
  });

  await logActivity(teamId, user.id, ActivityType.INVITE_TEAM_MEMBER);

  return { success: 'Đã gửi lời mời thành công!' };
}

export async function removeTeamMemberAction(data: { memberId: number }) {
  const user = await getUser();
  if (!user) {
    return { error: 'Quyền truy cập bị từ chối. Vui lòng đăng nhập.' };
  }

  const { memberId } = data;
  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return { error: 'Không tìm thấy không gian làm việc.' };
  }

  const [currentUserMember] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, userWithTeam.teamId)))
    .limit(1);

  const [targetMember] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, memberId))
    .limit(1);

  if (!targetMember) {
    return { error: 'Thành viên không tồn tại.' };
  }

  const isSelf = targetMember.userId === user.id;
  const isOwnerOrAdmin = currentUserMember?.role === 'owner' || currentUserMember?.role === 'admin';

  if (!isSelf && !isOwnerOrAdmin) {
    return { error: 'Quyền truy cập bị từ chối. Chỉ Chủ sở hữu hoặc Quản trị viên mới được phép xóa thành viên.' };
  }

  if (targetMember.role === 'owner' && !isSelf) {
    return { error: 'Không thể xóa Chủ sở hữu nhóm.' };
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, userWithTeam.teamId)));

  await logActivity(userWithTeam.teamId, user.id, ActivityType.REMOVE_TEAM_MEMBER);

  return { success: 'Đã xóa thành viên thành công.' };
}
