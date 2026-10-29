import type { Metadata } from "next";
import type { Conversation, Message, MessageTemplate } from "@ucommerz/shared";
import { getTranslations } from "next-intl/server";
import { canProvide, requireUser } from "@/app/lib/guards";
import { first, isUuid } from "@/app/lib/utils";
import { safely } from "@/app/lib/queries-extra";
import { MessagesClient } from "@/app/components/MessagesClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DashMessages");
  return { title: t("title") };
}

type Partner = { id: string; full_name: string | null; avatar_url: string | null };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { profile, supabase } = await requireUser("/dashboard/messages");
  const withId = first(sp.with) ?? first(sp.to);
  const bookingId = first(sp.booking);

  const { rows, partners } = await safely(
    async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, is_read, message_type")
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order("created_at", { ascending: false })
        .limit(500);
      const rows = (data as Pick<Message, "id" | "sender_id" | "receiver_id" | "content" | "created_at" | "is_read" | "message_type">[] | null) ?? [];
      const ids = new Set<string>(rows.map((m) => (m.sender_id === profile.id ? m.receiver_id : m.sender_id)));
      if (withId && isUuid(withId)) ids.add(withId);
      const { data: users } = ids.size ? await supabase.from("users").select("id, full_name, avatar_url").in("id", [...ids]) : { data: [] };
      return { rows, partners: new Map(((users as Partner[] | null) ?? []).map((u) => [u.id, u])) };
    },
    { rows: [], partners: new Map<string, Partner>() },
  );

  const conversations: Conversation[] = [];
  const seen = new Set<string>();
  for (const m of rows) {
    const pid = m.sender_id === profile.id ? m.receiver_id : m.sender_id;
    if (seen.has(pid)) continue;
    seen.add(pid);
    const partner = partners.get(pid);
    if (!partner) continue;
    conversations.push({
      partner,
      lastMessage: { id: m.id, content: m.content, created_at: m.created_at, sender_id: m.sender_id, message_type: m.message_type },
      unreadCount: rows.filter((x) => x.sender_id === pid && x.receiver_id === profile.id && !x.is_read).length,
    });
  }

  const activePartner = withId && isUuid(withId) && withId !== profile.id ? (partners.get(withId) ?? null) : null;
  const isProvider = canProvide(profile);
  const templates = isProvider
    ? await safely(async () => ((await supabase.from("message_templates").select("*").eq("provider_id", profile.id).eq("is_active", true).order("name")).data ?? []) as MessageTemplate[], [])
    : [];

  return (
    <MessagesClient
      me={{ id: profile.id, name: profile.full_name ?? "" }}
      conversations={conversations}
      activePartner={activePartner}
      templates={templates}
      isProvider={isProvider}
      bookingId={bookingId && isUuid(bookingId) ? bookingId : undefined}
    />
  );
}
