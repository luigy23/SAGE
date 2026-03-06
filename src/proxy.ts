import { NextRequest, NextResponse } from "next/server"

const publicRoutes = ["/auth/login", "/auth/register"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and API auth routes
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next()
  }

  // Check for session cookie (optimistic — actual validation in server components)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token")

  if (!sessionCookie) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
