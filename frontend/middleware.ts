import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest){
    const path = request.nextUrl.pathname;

    // 🔥 ท่าไม้ตาย: ให้สิทธิพิเศษหน้า register ผ่านไปได้เลย 100% ไม่ต้องเช็คคุกกี้!
    // ใครจะเข้าหน้า register ปล่อยผ่านทันที ห้ามเตะ!
    if (path === '/register') {
        return NextResponse.next();
    }

    // เช็คว่าเป็นหน้าที่ต้องล็อกอินไหม
    const hasFrontendCookie = request.cookies.get('is-logged-in')?.value === 'true';
    const hasBackendSession = request.cookies.get('research_session_id')?.value; 
    const isLoggedIn = hasFrontendCookie || !!hasBackendSession;

    // กำหนด "พื้นที่สาธารณะ" (เอา /register ออก เพราะเราดักให้ผ่านไปแล้วด้านบน)
    const isPublicPath = path === '/login' || path.startsWith('/2fa');

    // คนในห้ามออก
    if (isLoggedIn && isPublicPath) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // คนนอกห้ามเข้า
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