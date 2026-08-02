import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  users,
  teams,
  teamMembers,
  invitations,
  activityLogs,
  ActivityType,
  type NewUser,
  type NewTeam,
  type NewTeamMember
} from '@/lib/db/schema';
import { setSession } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;

  // Xoá cookie state ngay lập tức sau khi lấy ra để bảo mật
  cookieStore.delete('google_oauth_state');

  // Đọc và xoá cookie return_to (chỉ dùng một lần)
  const returnToCookie = cookieStore.get('oauth_return_to')?.value;
  cookieStore.delete('oauth_return_to');

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/sign-in?error=invalid_state`
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/sign-in?error=missing_credentials`
    );
  }

  try {
    // 1. Đổi code lấy tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Google token exchange error:', errorData);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=token_exchange_failed`
      );
    }

    const { access_token } = await tokenResponse.json();

    // 2. Fetch thông tin profile từ Google UserInfo API
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=fetch_profile_failed`
      );
    }

    const googleUser = await userResponse.json();
    const { sub: googleId, email, name, picture: avatarUrl, email_verified } = googleUser;

    if (!email) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=email_not_provided`
      );
    }

    // Chỉ cho phép đăng nhập/liên kết nếu Google đã xác minh email này
    if (!email_verified) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=email_not_verified`
      );
    }

    // 3. Xử lý đồng bộ Database
    let matchedUser = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1)
      .then(res => res[0]);

    let isNewUser = false;

    if (!matchedUser) {
      // Tìm theo email xem user này đã tạo bằng email truyền thống chưa
      const emailUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
        .then(res => res[0]);

      if (emailUser) {
        // Cập nhật googleId và avatarUrl cho user hiện tại
        // Đồng thời reset passwordHash thành rỗng nếu trước đó nó chưa có password thật (chặn backdoor đăng nhập bằng pass rỗng)
        const isPasswordEmpty = !emailUser.passwordHash || emailUser.passwordHash === '';
        
        const [updatedUser] = await db
          .update(users)
          .set({
            googleId,
            avatarUrl: emailUser.avatarUrl || avatarUrl,
            updatedAt: new Date(),
            ...(isPasswordEmpty ? { passwordHash: '' } : {}),
          })
          .where(eq(users.id, emailUser.id))
          .returning();
        matchedUser = updatedUser;
      } else {
        // Tạo user mới hoàn toàn
        isNewUser = true;
        const newUser: NewUser = {
          name: name || email.split('@')[0],
          email,
          googleId,
          avatarUrl,
          passwordHash: '', // Không có password cho user Google
          role: 'owner', // Default role
        };

        const [createdUser] = await db.insert(users).values(newUser).returning();
        matchedUser = createdUser;
      }
    }

    if (!matchedUser) {
      return NextResponse.redirect(
        `${request.nextUrl.origin}/sign-in?error=user_creation_failed`
      );
    }

    let teamId: number | null = null;
    let userRole = 'owner';

    // 4. Xử lý logic Team / Workspace
    if (isNewUser) {
      // Kiểm tra xem user này có lời mời (invitation) pending nào trùng khớp email không
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, email),
            eq(invitations.status, 'pending')
          )
        )
        .limit(1);

      if (invitation) {
        teamId = invitation.teamId;
        userRole = invitation.role;

        // Chấp nhận lời mời
        await db
          .update(invitations)
          .set({ status: 'accepted' })
          .where(eq(invitations.id, invitation.id));

        // Ghi log hoạt động accept invitation
        await db.insert(activityLogs).values({
          teamId,
          userId: matchedUser.id,
          action: ActivityType.ACCEPT_INVITATION,
          ipAddress: request.headers.get('x-forwarded-for') || '',
        });
      } else {
        // Tạo team mới nếu không có lời mời
        const newTeam: NewTeam = {
          name: `${name || email.split('@')[0]}'s Team`,
        };

        const [createdTeam] = await db.insert(teams).values(newTeam).returning();
        if (!createdTeam) {
          return NextResponse.redirect(
            `${request.nextUrl.origin}/sign-in?error=team_creation_failed`
          );
        }

        teamId = createdTeam.id;
        userRole = 'owner';

        // Ghi log hoạt động tạo team
        await db.insert(activityLogs).values({
          teamId,
          userId: matchedUser.id,
          action: ActivityType.CREATE_TEAM,
          ipAddress: request.headers.get('x-forwarded-for') || '',
        });
      }

      // Add user vào team_members
      const newTeamMember: NewTeamMember = {
        userId: matchedUser.id,
        teamId,
        role: userRole,
      };
      await db.insert(teamMembers).values(newTeamMember);

      // Ghi log SIGN_UP
      await db.insert(activityLogs).values({
        teamId,
        userId: matchedUser.id,
        action: ActivityType.SIGN_UP,
        ipAddress: request.headers.get('x-forwarded-for') || '',
      });
    } else {
      // User cũ: Lấy teamId hiện có của user
      const memberInfo = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, matchedUser.id))
        .limit(1)
        .then(res => res[0]);

      teamId = memberInfo?.teamId || null;

      // Ghi log SIGN_IN
      if (teamId) {
        await db.insert(activityLogs).values({
          teamId,
          userId: matchedUser.id,
          action: ActivityType.SIGN_IN,
          ipAddress: request.headers.get('x-forwarded-for') || '',
        });
      }
    }

    // 5. Tạo Session Cookie cho user và redirect tới Dashboard
    await setSession(matchedUser);

    let redirectUrl = `${request.nextUrl.origin}/dashboard`;
    if (returnToCookie) {
      try {
        const { redirect: redirectParam, priceId, inviteId } = JSON.parse(returnToCookie);
        if (redirectParam === 'checkout' && priceId) {
          redirectUrl = `${request.nextUrl.origin}/dashboard/store?priceId=${priceId}`;
        } else if (redirectParam) {
          // Phòng chống lỗ hổng Open Redirect: chỉ cho phép đường dẫn relative bắt đầu bằng '/'
          if (redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
            redirectUrl = `${request.nextUrl.origin}${redirectParam}`;
          }
        }
      } catch (error) {
        console.error('Failed to parse oauth_return_to cookie:', error);
      }
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.redirect(
      `${request.nextUrl.origin}/sign-in?error=internal_server_error`
    );
  }
}
