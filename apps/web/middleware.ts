import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/middleware";
import { enforceRateLimit, getClientIp } from "@/app/lib/rate-limit";

const PROTECTED_PREFIXES = ["/dashboard", "/profile"];

function csv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Edge middleware:
 *  1. refreshes the Supabase auth cookies (token refresh),
 *  2. redirects anonymous visitors away from private areas,
 *  3. applies IP rules to /admin and a rate limit to /api,
 *  4. adds `x-pathname` so server layouts can read the current path.
 *
 * Authorization (roles) is enforced again on the server by the guards in app/lib/guards.ts.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request.headers);

  // --- /api rate limit -------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    const limited = enforceRateLimit(request, "api", {
      max: Number(process.env.API_RATE_LIMIT ?? 100),
      windowMs: Number(process.env.API_RATE_WINDOW ?? 60_000),
    });
    if (limited) return limited;
  }

  // --- admin IP rules --------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    const blacklist = csv(process.env.ADMIN_IP_BLACKLIST);
    if (blacklist.includes(ip)) return new NextResponse("Forbidden", { status: 403 });
    if (process.env.ENFORCE_ADMIN_IP_WHITELIST === "true") {
      const whitelist = csv(process.env.ADMIN_IP_WHITELIST);
      if (whitelist.length > 0 && !whitelist.includes(ip)) return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const { response, user } = await updateSession(request);

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname.startsWith("/admin");
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    // keep any refreshed cookies
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    /*
     * Skip static files and images:
     * _next/static, _next/image, favicon and common image/font extensions.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
