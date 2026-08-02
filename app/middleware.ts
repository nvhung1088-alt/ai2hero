import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

// ── JWT helpers inlined for Edge Runtime compatibility ──────────────────────
// DO NOT import from @/lib/auth/* here – Vercel Edge Runtime cannot resolve
// path aliases when Sentry wraps the config and may treat them as externals.

type SessionData = {
  user: { id: number; role?: string; email: string; name?: string | null };
  expires: string;
};

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

async function signToken(payload: SessionData): Promise<string> {
  return new SignJWT(payload as Parameters<InstanceType<typeof SignJWT>['sign']>[0] & Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(getKey());
}

async function verifyToken(input: string): Promise<SessionData> {
  const { payload } = await jwtVerify(input, getKey(), { algorithms: ['HS256'] });
  return payload as unknown as SessionData;
}

// ───────────────────────────────────────────────────────────────────────────

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

  const res = NextResponse.next();

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
          value: await signToken({ ...parsed, expires: expiresInOneDay.toISOString() }),
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          expires: expiresInOneDay,
        });
      }
    } catch {
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
