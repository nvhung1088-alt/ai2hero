import { desc, and, eq, isNull, inArray } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users, systemSettings, feedPosts, feedComments, feedLikes, invitations } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';
import { getActiveTeamCookie } from '@/lib/team-cookie';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
      teamName: teams.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(teams, eq(activityLogs.teamId, teams.id))
    .where(
      and(
        eq(activityLogs.userId, user.id),
        isNull(teams.deletedAt)
      )
    )
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  // 1. Thử lấy activeTeamId từ cookie
  const activeTeamId = await getActiveTeamCookie();
  if (activeTeamId) {
    const result = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.userId, user.id),
        eq(teamMembers.teamId, activeTeamId)
      ),
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

    if (result && result.team && !result.team.deletedAt) {
      return result.team;
    }
  }

  // 2. Fallback nếu không có cookie activeTeamId hoặc không tìm thấy team/user tương ứng
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

  if (result?.team?.deletedAt) return null;
  return result?.team || null;
}

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
    if (m.team.deletedAt) return null; // Lọc workspace đã xóa mềm
    return {
      ...m.team,
      role: m.role,
      memberCount: m.team.teamMembers?.length || 0,
    };
  }).filter(Boolean) as any[];
}

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

  if (team?.deletedAt) return null; // Workspace đã bị xóa mềm
  return team || null;
}

export async function getFeedPosts(userTeamIds: number[]) {
  const user = await getUser();
  if (!user) return [];
  if (userTeamIds.length === 0) return [];

  const posts = await db.query.feedPosts.findMany({
    where: inArray(feedPosts.teamId, userTeamIds),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      comments: {
        orderBy: desc(feedComments.createdAt)
      },
      likesList: true
    },
    orderBy: desc(feedPosts.createdAt)
  });

  return posts.map(post => {
    const likedByMe = post.likesList.some(like => like.userId === user.id);
    return {
      id: post.id,
      type: post.type,
      teamId: post.teamId ? `team-${post.teamId}` : 'team-1', // Convert to string matches in UI
      teamIdNum: post.teamId,
      userId: post.userId,
      userName: post.user?.name || 'Hệ thống',
      userAvatar: '👤',
      userRole: post.user?.role || 'member',
      timestamp: new Date(post.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(post.createdAt).toISOString().split('T')[0],
      message: post.message,
      likes: post.likesList.length,
      likedByMe,
      comments: post.comments.map(c => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        userAvatar: c.userAvatar,
        content: c.content,
        timestamp: new Date(c.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      })).reverse(), // Render chronological order in UI
      mentions: Array.isArray(post.mentions) ? post.mentions : [],
      attachments: Array.isArray(post.attachments) ? post.attachments : [],
      appId: post.appId || undefined,
      resultPreview: post.resultPreview || undefined,
      resultMetrics: Array.isArray(post.resultMetrics) ? post.resultMetrics : [],
      taskTitle: post.taskTitle || undefined,
      taskStatus: post.taskStatus || undefined,
      taskAssignee: post.taskAssignee || undefined,
      taskDueDate: post.taskDueDate || undefined,
      pinned: post.pinned === 1,
      pinnedBy: post.pinnedBy || undefined
    };
  });
}

export async function getInvitationsForTeam(teamId: number) {
  return await db.query.invitations.findMany({
    where: and(eq(invitations.teamId, teamId), eq(invitations.status, 'pending')),
    orderBy: desc(invitations.invitedAt),
  });
}

export const DEFAULT_BILLING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '0đ',
    period: 'trọn đời',
    description: 'Phù hợp cho cá nhân & thử nghiệm ý tưởng MVP',
    features: [
      'Sử dụng tối đa 2 công cụ MVPs',
      '100 lượt chat AI / ngày',
      '1 workspace cố định',
      'Hỗ trợ qua cộng đồng Discord',
      'Uptime 99.5%'
    ],
    maxMembers: 1,
    maxOwnedWorkspaces: 1,
    allowedApps: ['chat', 'hub', 'herovideo'],
    cta: 'Bắt đầu ngay'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '199.000đ',
    period: 'tháng',
    description: 'Dành cho đội ngũ phát triển và tối ưu hiệu suất công việc',
    features: [
      'Không giới hạn lượt chat AI',
      'Tối đa 10 thành viên workspace',
      'Tốc độ phản hồi AI ưu tiên',
      'Hỗ trợ tích hợp API key riêng',
      'Hỗ trợ 24/7 qua Slack/Email',
      'Uptime cam kết 99.9%'
    ],
    maxMembers: 10,
    maxOwnedWorkspaces: 5,
    allowedApps: ['chat', 'hub', 'api', 'sim', 'pos', 'content', 'herovideo'],
    cta: 'Nâng cấp Pro'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Liên hệ',
    period: '',
    description: 'Giải pháp tùy chỉnh & triển khai hạ tầng bảo mật riêng',
    features: [
      'Custom AI models & Fine-tuning riêng',
      'Thành viên workspace không giới hạn',
      'Triển khai On-Premise hoặc Cloud riêng',
      'SLA bảo mật cam kết 99.99%',
      'Kỹ sư giải pháp hỗ trợ 1-1 trực tiếp',
      'Hợp đồng bảo mật thông tin & NDA'
    ],
    maxMembers: 9999,
    maxOwnedWorkspaces: 50,
    allowedApps: ['chat', 'hub', 'api', 'sim', 'pos', 'content', 'herovideo'],
    cta: 'Liên hệ ngay'
  }
];

export async function getSystemSetting(key: string) {
  try {
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    if (result.length > 0) {
      return result[0].value;
    }
  } catch (error) {
    console.error('Error fetching system setting:', error);
  }

  if (key === 'BILLING_PLANS') {
    return DEFAULT_BILLING_PLANS;
  }
  return null;
}

export async function updateSystemSetting(key: string, value: any) {
  const existing = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemSettings)
      .set({
        value,
        updatedAt: new Date()
      })
      .where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({
      key,
      value,
      updatedAt: new Date()
    });
  }
}

