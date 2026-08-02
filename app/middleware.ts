import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/session';

const protectedRoutes = ['/dashboard', '/admin', '/sim', '/profile', '/friends', '/messages', '/settings'];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const { pathname } = url;
  const hostname = request.headers.get('host') || '';

  // Determine root domain based on environment
  const ROOT_DOMAIN = process.env.NODE_ENV === 'production' ? 'ai2hero.com' : hostname;

  // Extract subdomain
  let subdomain = null;
  if (hostname !== ROOT_DOMAIN && !hostname.startsWith(`www.${ROOT_DOMAIN}`)) {
    subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '');
  }

  // Subdomain routing
  if (subdomain && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/sites')) {
    return NextResponse.rewrite(new URL(`/sites/${subdomain}${pathname}`, request.url));
  }

  const sessionCookie = request.cookies.get('session');
  const isProtectedRoute = protectedRoutes.some((route) =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );

  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  let res = NextResponse.next();

  if (sessionCookie) {
    try {
      const parsed = await verifyToken(sessionCookie.value);
      
      // Strict RBAC check for Admin Routes at routing layer
      if (pathname.startsWith('/admin') && parsed?.user?.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      if (request.method === 'GET') {
        const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);

        res.cookies.set({
          name: 'session',
          value: await signToken({
            ...parsed,
            expires: expiresInOneDay.toISOString()
          }),
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          expires: expiresInOneDay
        });
      }
    } catch (error) {
      console.error('Error updating session:', error);
      res.cookies.delete('session');
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
