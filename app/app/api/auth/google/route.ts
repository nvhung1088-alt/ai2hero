import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'Missing GOOGLE_CLIENT_ID in environment variables' }, { status: 500 });
  }

  // Tạo CSRF state ngẫu nhiên để chống tấn công giả mạo
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // Hết hạn trong 10 phút
  });

  // Đọc query params từ request của UI và lưu vào cookie return_to tạm thời
  const redirectParam = request.nextUrl.searchParams.get('redirect');
  const priceId = request.nextUrl.searchParams.get('priceId');
  const inviteId = request.nextUrl.searchParams.get('inviteId');

  if (redirectParam || priceId || inviteId) {
    cookieStore.set(
      'oauth_return_to',
      JSON.stringify({
        redirect: redirectParam || undefined,
        priceId: priceId || undefined,
        inviteId: inviteId || undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // Hết hạn trong 10 phút
      }
    );
  }

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  return NextResponse.redirect(googleAuthUrl.toString());
}
