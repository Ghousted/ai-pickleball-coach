import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Optimistic check only: no session cookie means "go to the landing page". Routes still check the session. */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/setup", "/quests/:path*", "/videos/:path*", "/drills/:path*", "/compare/:path*", "/journey", "/you/:path*", "/chat", "/film/:path*"],
};
