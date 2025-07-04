import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
  const hasMembership = token?.memberships && token.memberships.length > 0;

  // If user is on an auth page
  if (isAuthPage) {
    if (token) {
      // If they are logged in, redirect to dashboard or onboarding
      const url = hasMembership ? '/dashboard' : '/onboarding';
      return NextResponse.redirect(new URL(url, req.url));
    }
    // Not logged in, can access auth page
    return NextResponse.next();
  }

  // For any other page, user must be logged in
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // If logged in, but has no org membership, force to onboarding
  if (!hasMembership && pathname !== '/onboarding') {
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // If logged in, has org, but tries to access onboarding, redirect to dashboard
  if (hasMembership && pathname === '/onboarding') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/collect (public endpoint for form submissions)
     * - api/register (public API route for registration)
     * - api/auth (NextAuth routes)
     * - api/organizations (organizations API route)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - files in the public folder with extensions (.js, .svg, etc.)
     */
    '/((?!api/collect|api/register|api/auth|api/organizations|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}; 