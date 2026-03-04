import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
    // ดัก Error ขั้นสุดยอด ถ้าพังก็ปล่อยผ่านไปเลย เว็บจะได้ไม่ล่ม
    console.error("Proxy Error:", error);
    return NextResponse.next();
  }
}

// 🔥 ท่าไม้ตาย: เลิกใช้ Regex ดักทุกหน้า เปลี่ยนมาระบุ Path ตรงๆ ที่เราต้องการป้องกัน
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