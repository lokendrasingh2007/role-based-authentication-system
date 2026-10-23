import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware — protects routes before any page renders.
 *
 * Since the JWT is stored in an HttpOnly cookie, we cannot decode it
 * in the edge runtime without the secret. We use a simple cookie
 * presence check to redirect unauthenticated users. The actual
 * authorization (role check for admin pages) is enforced on the
 * server-side API — this middleware only handles redirects.
 */

const PUBLIC_PATHS = ['/login', '/register', '/403'];
const ADMIN_PATHS = ['/admin'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without a token
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin paths we can't decode the JWT in Edge without the secret.
  // The admin API enforces authorization — the page itself will redirect
  // to /403 if the API returns 403.
  void ADMIN_PATHS; // referenced for documentation

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
