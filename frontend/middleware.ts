import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest){
    // ดึง path ปัจจุบัน
    const path = request.nextUrl.pathname;

    const isLoggedIn = request.cookies.get('is-logged-in')?.value === 'true';

    const isPublicPath = path === '/login' || 
                         path === '/register' || 
                         path === '/security-checkpoint' ||
                         path.startsWith('/captcha') || 
                         path.startsWith('/2fa');

    if (isLoggedIn && isPublicPath) {
      return NextResponse.redirect(new URL('/survey', request.url));
    }

    if (!isLoggedIn && !isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};