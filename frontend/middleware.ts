//middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest){
    // ดึง path ปัจจุบัน
    const path = request.nextUrl.pathname;

    const token = request.cookies.get('auth_token')?.value;
    const isLoggedIn = !!token;
                         
    const isGuestOnlyPath = path === '/login' || path === '/register';

    const isProtectedPath = path === '/survey' || path === '/thank-you';

    // const isPublicPath = path === '/login' || 
    //                      path === '/register' || 
    //                      path === '/security-checkpoint' ||
    //                      path.startsWith('/captcha') || 
    //                      path.startsWith('/2fa');


    if (isLoggedIn && isGuestOnlyPath) {
      return NextResponse.redirect(new URL('/survey', request.url));
    }

    if (!isLoggedIn && isProtectedPath) {
      console.log(`🚫 Access denied to ${path}, redirecting to login`);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};