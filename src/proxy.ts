import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Route protection. JWT checks only (no DB access) so this stays fast;
 * every sensitive operation re-verifies role/status server-side in
 * requireUser/requireRole (src/lib/auth-helpers.ts).
 */
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  const isAuthPage = path === "/login" || path === "/register" || path === "/forgot-password" || path === "/reset-password";
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/admin") ||
    path.startsWith("/messages") ||
    path.startsWith("/notifications") ||
    path === "/account" ||
    path.startsWith("/account/");

  if (isProtected && !session?.user) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (path.startsWith("/admin") && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/forbidden", nextUrl.origin));
  }

  if (isAuthPage && session?.user) {
    const role = session.user.role;
    const home =
      role === "ADMIN" ? "/admin" : role === "STUDENT" ? "/dashboard/student" : "/dashboard/landlord";
    return NextResponse.redirect(new URL(home, nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/messages/:path*",
    "/notifications",
    "/account",
    "/account/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
