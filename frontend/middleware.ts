import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest){
    //ดึง path ปัจจุบัน
    const path = request.nextUrl.pathname;

    // เช็คว่าเป็นหน้าที่ต้องล็อกอินไหม
    const hasFrontendCookie = request.cookies.get('is-logged-in')?.value === 'true';
    const hasBackendSession = request.cookies.get('research_session_id')?.value; 
    const isLoggedIn = hasFrontendCookie || !!hasBackendSession;

    //กำหนด "พื้นที่สาธารณะ"
    const isPublicPath = path === '/login' || 
                       path === '/register' || 
                       path.startsWith('/2fa');

    //คนในห้ามออก
    if (isLoggedIn && isPublicPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    //คนนอกห้ามเข้า
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