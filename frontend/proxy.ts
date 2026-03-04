import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname) {
    return NextResponse.next();
  }

  const isLoggedIn = request.cookies.get("auth_token")?.value;

  const isGuestOnlyPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  const isProtectedPath =
    pathname.startsWith("/survey") ||
    pathname.startsWith("/thank-you");

  if (isLoggedIn && isGuestOnlyPath) {
    return NextResponse.redirect(new URL("/survey", request.url));
  }

  if (!isLoggedIn && isProtectedPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};