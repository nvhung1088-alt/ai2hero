import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// MINIMAL TEST: no jose, no custom logic
// If this still fails with MIDDLEWARE_INVOCATION_FAILED
// the issue is with Vercel project setup, not our code.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
