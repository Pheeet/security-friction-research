import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 🔥 แก้ตรงนี้ครับ: เปลี่ยนจาก middleware เป็น proxy
export function proxy(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const isLoggedIn = request.cookies.has('auth_token');

    // หน้าที่ห้ามคนล็อกอินแล้วเข้า (ต้องเป็น Guest เท่านั้น)
    const isGuestOnlyPath = path === '/login' || path === '/register';
    
    // หน้าที่บังคับว่าต้องล็อกอินก่อนถึงจะเข้าได้
    const isProtectedPath = path === '/survey' || path === '/thank-you';

    if (isLoggedIn && isGuestOnlyPath) {
      return NextResponse.redirect(new URL('/survey', request.url));
    }

    if (!isLoggedIn && isProtectedPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
    
  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/survey',
    '/thank-you',
    '/welcome',
    '/security-checkpoint'
  ],
};