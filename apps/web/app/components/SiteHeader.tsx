import { getAuth } from "@/app/lib/guards";
import { Navigation, type NavUser } from "@/app/components/Navigation";

/** Server component: resolves the session and unread-message count, then renders the client Navigation. */
export async function SiteHeader() {
  let user: NavUser | null = null;
  let unread = 0;

  try {
    const { supabase, profile } = await getAuth();
    if (profile && profile.is_active) {
      user = {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: profile.role,
      };
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", profile.id)
        .eq("is_read", false);
      unread = count ?? 0;
    }
  } catch (error) {
    // Never let a header failure (e.g. missing env vars during first setup) take the whole page down.
    console.error("[SiteHeader]", error);
  }

  return <Navigation user={user} unreadMessages={unread} />;
}
