import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const isLoggedIn = request.cookies.has('auth_token');
                             
    const isGuestOnlyPath = path === '/login' || path === '/register';
    const isProtectedPath = path === '/survey' || path === '/thank-you';

    if (isLoggedIn && isGuestOnlyPath) {
      return NextResponse.redirect(new URL('/survey', request.url));
    }

    if (!isLoggedIn && isProtectedPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
    
  } catch (error) {
    // 🔥 ท่าไม้ตาย: ดัก Error ไว้ เพื่อให้เว็บยังทำงานต่อได้ไม่ขึ้น 500
    console.error("Middleware invocation failed:", error);
    return NextResponse.next(); 
  }
}

export const config = {
  matcher: [
    /*
     * อัปเดต Regex ตามคำแนะนำล่าสุดของ Next.js 
     * ข้ามการทำงานในโฟลเดอร์ api, _next/static, _next/image, _vercel 
     * และข้ามพวกไฟล์รูปภาพหรือไฟล์ที่มีนามสกุล (.png, .ico, ฯลฯ)
     */
    '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)',
  ],
};