import { getAuth } from "@/app/lib/guards";
import { Navigation, type NavUser } from "@/app/components/Navigation";

/** Server component: resolves the session (the unread-message badge is loaded client-side so it never blocks the page), then renders the client Navigation. */
export async function SiteHeader() {
  let user: NavUser | null = null;

  try {
    const { profile } = await getAuth();
    if (profile && profile.is_active) {
      user = {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: profile.role,
      };
    }
  } catch (error) {
    // Never let a header failure (e.g. missing env vars during first setup) take the whole page down.
    console.error("[SiteHeader]", error);
  }

  return <Navigation user={user} />;
}
