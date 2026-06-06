import { and, eq } from 'drizzle-orm';
import { db } from './drizzle';
import { teamMembers, type TeamMember } from './schema';

/**
 * Xác thực user thuộc team + có role phù hợp.
 * Trả về member record hoặc throw lỗi.
 */
export async function requireTeamRole(
  userId: number,
  teamId: number,
  allowedRoles: string[]
): Promise<TeamMember> {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId)
    ))
    .limit(1);

  if (!member) {
    throw new Error('NOT_MEMBER');
  }
  if (!allowedRoles.includes(member.role)) {
    throw new Error('INSUFFICIENT_ROLE');
  }
  return member;
}

/**
 * Xác nhận targetMember thuộc đúng teamId.
 * Chống cross-team spoofing.
 */
export async function assertMemberInTeam(
  memberId: number,
  teamId: number
): Promise<TeamMember> {
  const [target] = await db
    .select()
    .from(teamMembers)
    .where(and(
      eq(teamMembers.id, memberId),
      eq(teamMembers.teamId, teamId)
    ))
    .limit(1);

  if (!target) {
    throw new Error('MEMBER_NOT_FOUND');
  }
  return target;
}
