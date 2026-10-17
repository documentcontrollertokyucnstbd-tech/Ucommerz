"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Check, CheckCheck, FileIcon, Loader2, MessageSquare, Paperclip, Send, X } from "lucide-react";
import { STORAGE_BUCKETS, type Conversation, type Message, type MessageTemplate } from "@ucommerz/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { MessageTemplates } from "@/app/components/MessageTemplates";
import { UserSearchDialog, type PickedUser } from "@/app/components/UserSearchDialog";
import { useRealtimeMessages } from "@/app/hooks/useRealtimeMessages";
import { useSupabase } from "@/app/hooks/useSupabase";
import { markConversationReadAction, sendMessageAction } from "@/app/actions/messages";
import { toastAction } from "@/app/lib/toast-action";
import { uploadFile } from "@/app/lib/upload";
import { avatarOf } from "@/app/lib/media";
import { cn, formatCurrency, formatRelative, initials } from "@/app/lib/utils";

type Partner = Pick<PickedUser, "id" | "full_name" | "avatar_url">;

type Props = {
  me: { id: string; name: string };
  conversations: Conversation[];
  activePartner: Partner | null;
  templates: MessageTemplate[];
  isProvider: boolean;
  bookingId?: string;
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MessagesClient({ me, conversations: initial, activePartner, templates, isProvider, bookingId }: Props) {
  const supabase = useSupabase();
  const router = useRouter();
  const qc = useQueryClient();
  const [conversations, setConversations] = useState<Conversation[]>(initial);
  const [active, setActive] = useState<Partner | null>(activePartner);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const fileInput = useRef<HTMLInputElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const threadKey = useMemo(() => ["thread", active?.id], [active?.id]);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: threadKey,
    enabled: Boolean(active),
    queryFn: async () => {
      const a = active as Partner;
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${me.id},receiver_id.eq.${a.id}),and(sender_id.eq.${a.id},receiver_id.eq.${me.id})`)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Variables for template substitution come from the latest booking with this customer.
  const { data: ctxBooking } = useQuery({
    queryKey: ["template-booking", active?.id, bookingId],
    enabled: isProvider && Boolean(active) && templates.length > 0,
    queryFn: async () => {
      const a = active as Partner;
      let q = supabase.from("bookings").select("booking_date, total_price, service:services(title)").eq("provider_id", me.id).eq("seeker_id", a.id);
      if (bookingId) q = q.eq("id", bookingId);
      const { data } = await q.order("booking_date", { ascending: false }).limit(1).maybeSingle();
      return data as unknown as { booking_date: string; total_price: number; service: { title: string } | null } | null;
    },
  });

  const vars = useMemo(() => {
    const d = ctxBooking ? new Date(ctxBooking.booking_date) : null;
    return {
      name: active?.full_name ?? undefined,
      provider: me.name,
      service: ctxBooking?.service?.title,
      date: d?.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
      time: d?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
      price: ctxBooking ? formatCurrency(ctxBooking.total_price) : undefined,
    };
  }, [ctxBooking, active?.full_name, me.name]);

  const touchConversation = useCallback((partner: Partner, m: Message, incoming: boolean) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.partner.id === partner.id);
      const isActive = activeRef.current?.id === partner.id;
      const next: Conversation = {
        partner: existing?.partner ?? partner,
        lastMessage: { id: m.id, content: m.content, created_at: m.created_at, sender_id: m.sender_id, message_type: m.message_type },
        unreadCount: incoming && !isActive ? (existing?.unreadCount ?? 0) + 1 : isActive ? 0 : (existing?.unreadCount ?? 0),
      };
      return [next, ...prev.filter((c) => c.partner.id !== partner.id)];
    });
  }, []);

  useRealtimeMessages(me.id, {
    onIncoming: async (m) => {
      const known = conversations.find((c) => c.partner.id === m.sender_id)?.partner ?? (activeRef.current?.id === m.sender_id ? activeRef.current : null);
      let partner: Partner | null = known;
      if (!partner) {
        const { data } = await supabase.from("users").select("id, full_name, avatar_url").eq("id", m.sender_id).maybeSingle();
        partner = (data as Partner | null) ?? { id: m.sender_id, full_name: "New message", avatar_url: null };
      }
      touchConversation(partner, m, true);
      if (activeRef.current?.id === m.sender_id) {
        qc.setQueryData<Message[]>(["thread", m.sender_id], (old) => (old && !old.some((x) => x.id === m.id) ? [...old, m] : old));
        void markConversationReadAction(m.sender_id);
      } else {
        toast(`${partner.full_name ?? "Someone"}: ${m.content.slice(0, 60)}`, { icon: "💬" });
      }
    },
    onSentUpdated: (m) => {
      qc.setQueryData<Message[]>(["thread", m.receiver_id], (old) => old?.map((x) => (x.id === m.id ? m : x)));
    },
  });

  // Opening a conversation marks it read.
  useEffect(() => {
    if (!active) return;
    setConversations((prev) => prev.map((c) => (c.partner.id === active.id ? { ...c, unreadCount: 0 } : c)));
    void markConversationReadAction(active.id);
  }, [active]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, active?.id]);

  function open(p: Partner) {
    setActive(p);
    router.replace(`/dashboard/messages?with=${p.id}`, { scroll: false });
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(list).slice(0, 5 - files.length).map((f) => uploadFile(f, { bucket: STORAGE_BUCKETS.messages, userId: me.id, allowPdf: true })));
      setFiles((prev) => [...prev, ...urls].slice(0, 5));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function send() {
    if (!active || sending) return;
    const content = text.trim() || (files.length ? "📎 Attachment" : "");
    if (!content) return;
    setSending(true);
    const res = await toastAction(sendMessageAction({ receiver_id: active.id, content, attachments: files, booking_id: bookingId, template_id: templateId }));
    setSending(false);
    if (res.ok && res.data) {
      const m = res.data.message;
      qc.setQueryData<Message[]>(["thread", active.id], (old) => (old ? [...old, m] : [m]));
      touchConversation(active, m, false);
      setText("");
      setFiles([]);
      setTemplateId(undefined);
    }
  }

  return (
    <div className="grid h-[calc(100dvh-11rem)] min-h-[480px] overflow-hidden rounded-xl border bg-card lg:grid-cols-[320px_1fr]">
      {/* conversations */}
      <aside className={cn("flex min-h-0 flex-col border-r", active && "hidden lg:flex")}>
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="font-semibold">Messages</h2>
          <UserSearchDialog meId={me.id} onPick={open} />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {conversations.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No conversations yet. Start one with “New”.</li>}
          {conversations.map((c) => (
            <li key={c.partner.id}>
              <button type="button" onClick={() => open(c.partner)} className={cn("flex w-full items-center gap-3 border-b p-3 text-left transition hover:bg-accent", active?.id === c.partner.id && "bg-accent")}>
                <Avatar className="size-10"><AvatarImage src={avatarOf(c.partner.avatar_url)} alt="" /><AvatarFallback>{initials(c.partner.full_name)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{c.partner.full_name ?? "User"}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(c.lastMessage.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">{c.lastMessage.sender_id === me.id ? "You: " : ""}{c.lastMessage.content}</p>
                    {c.unreadCount > 0 && <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">{c.unreadCount}</Badge>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* thread */}
      <section className={cn("flex min-h-0 flex-col", !active && "hidden lg:flex")}>
        {!active ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="size-10 opacity-40" />
            <p className="text-sm">Select a conversation or start a new one.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b p-3">
              <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => { setActive(null); router.replace("/dashboard/messages", { scroll: false }); }} aria-label="Back to conversations"><ArrowLeft /></Button>
              <Avatar className="size-9"><AvatarImage src={avatarOf(active.avatar_url)} alt="" /><AvatarFallback>{initials(active.full_name)}</AvatarFallback></Avatar>
              <p className="font-medium">{active.full_name ?? "User"}</p>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin" aria-live="polite">
              {isLoading && <p className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></p>}
              {!isLoading && messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Say hello 👋</p>}
              {messages.map((m) => {
                const mine = m.sender_id === me.id;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      {m.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.attachments.map((u) =>
                            /\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) ? (
                              <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt="Attachment" className="max-h-40 rounded-lg" loading="lazy" /></a>
                            ) : (
                              <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-black/10 px-2 py-1 text-xs underline"><FileIcon className="size-3.5" /> File</a>
                            ),
                          )}
                        </div>
                      )}
                      <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {timeLabel(m.created_at)}
                        {mine && (m.is_read ? <CheckCheck className="size-3" aria-label="Read" /> : <Check className="size-3" aria-label="Sent" />)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>
            <footer className="space-y-2 border-t p-3">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((u) => (
                    <span key={u} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                      <Paperclip className="size-3" /> {u.split("/").pop()?.slice(0, 14)}…
                      <button type="button" aria-label="Remove attachment" onClick={() => setFiles((p) => p.filter((x) => x !== u))}><X className="size-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="sr-only" onChange={(e) => onFiles(e.target.files)} aria-label="Attach files" />
                <Button type="button" variant="ghost" size="icon" onClick={() => fileInput.current?.click()} disabled={uploading || files.length >= 5} aria-label="Attach a file">
                  {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
                </Button>
                {isProvider && <MessageTemplates templates={templates} vars={vars} onPick={(t, id) => { setText(t); setTemplateId(id); }} />}
                <Textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Write a message…"
                  className="max-h-32 min-h-9 resize-none"
                  aria-label="Message"
                />
                <Button type="button" size="icon" onClick={send} disabled={sending || (!text.trim() && files.length === 0)} aria-label="Send">
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
