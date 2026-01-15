import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const auth = request.cookies.get("auth")?.value;

  if (!auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next (Next.js internals)
     * - favicon.ico
     * - login, signup pages
     * - api routes
     * - Static files (images, fonts, etc.)
     */
    "/((?!_next|favicon\\.ico|login|signup|api|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|webp|mp4|webm)$).*)",
  ],
};
