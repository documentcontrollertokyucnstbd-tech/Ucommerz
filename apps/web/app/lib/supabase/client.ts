import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (Client Components, realtime, direct storage uploads).
 * The browser client must read the auth cookie to attach the JWT to realtime and
 * storage requests, so that cookie cannot be httpOnly. It is `secure` in
 * production and `sameSite=lax`.
 */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}
