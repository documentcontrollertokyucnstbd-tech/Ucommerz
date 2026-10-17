import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { safeNext } from "@/app/lib/safe-next";

/**
 * Handles the links Supabase emails out: email verification (signup) and password recovery.
 * Exchanges the one-time `code` for a session (cookies are set by the server client) and redirects.
 * Add  <APP_URL>/auth/callback  to Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = request.nextUrl;
    const code = searchParams.get("code");
    const next = safeNext(searchParams.get("next"), "/dashboard");

    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth-callback`);
  } catch (error) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(`${request.nextUrl.origin}/login?error=auth-callback`);
  }
}
