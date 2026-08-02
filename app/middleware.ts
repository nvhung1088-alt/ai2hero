import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

// ── JWT helpers inlined – Edge Runtime safe (no @/lib imports) ──────────────

type SessionData = {
  user: { id: number; role?: string; email: string; name?: string | null };
  expires: string;
};

async function signToken(payload: SessionData): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

async function verifyToken(input: string): Promise<SessionData> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
  return payload as unknown as SessionData;
}

// ───────────────────────────────────────────────────────────────────────────

const ROOT_DOMAIN = 'ai2hero.com';
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/sim',
  '/profile',
  '/friends',
  '/messages',
  '/settings',
];

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Only detect real subdomains: must end with .ai2hero.com
    // Vercel preview URLs (*.vercel.app) are NOT subdomains
    const isRealSubdomain =
      process.env.NODE_ENV === 'production' &&
      hostname.endsWith(`.${ROOT_DOMAIN}`) &&
      !hostname.startsWith('www.');

    if (isRealSubdomain) {
      const subdomain = hostname.slice(0, hostname.length - ROOT_DOMAIN.length - 1);
      if (
        subdomain &&
        !pathname.startsWith('/api') &&
        !pathname.startsWith('/_next') &&
        !pathname.startsWith('/sites')
      ) {
        return NextResponse.rewrite(new URL(`/sites/${subdomain}${pathname}`, request.url));
      }
    }

    const sessionCookie = request.cookies.get('session');
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtectedRoute && !sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const res = NextResponse.next();

    if (sessionCookie) {
      try {
        const parsed = await verifyToken(sessionCookie.value);

        // Strict RBAC: only super_admin can access /admin
        if (pathname.startsWith('/admin') && parsed?.user?.role !== 'super_admin') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Refresh session on GET requests
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
        // Invalid/expired session – clear cookie and redirect if protected
        res.cookies.delete('session');
        if (isProtectedRoute) {
          return NextResponse.redirect(new URL('/sign-in', request.url));
        }
      }
    }

    return res;
  } catch (err) {
    // Global safety net – log and fail open so site stays up
    console.error('[middleware] unexpected error:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
