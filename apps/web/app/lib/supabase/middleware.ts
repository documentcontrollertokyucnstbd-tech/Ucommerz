import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth session on every matched request using the
 * request/response cookies (the only place Next.js lets middleware write them).
 * Returns the response (carrying refreshed cookies) and the current user, if any.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getSession() reads the cookie and only hits the network when the token must be refreshed, which keeps
  // every request fast. It is only used for the "signed in?" redirect; the guards in app/lib/guards.ts
  // validate the user with getUser() before any private data is read.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { response, signedIn: Boolean(session) };
}
