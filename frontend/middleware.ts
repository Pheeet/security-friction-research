import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoggedIn = request.cookies.has("auth_token");

  const isGuestOnlyPath = path === "/login" || path === "/register";
  const isProtectedPath = path === "/survey" || path === "/thank-you";

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
    "/",
    "/login",
    "/register",
    "/survey",
    "/thank-you",
    "/welcome",
    "/security-checkpoint",
  ],
};