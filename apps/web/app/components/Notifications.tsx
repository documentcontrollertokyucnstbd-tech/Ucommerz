"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@ucommerz/shared";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useSupabase } from "@/app/hooks/useSupabase";
import { useRealtimeNotifications } from "@/app/hooks/useRealtimeNotifications";
import { markNotificationsReadAction } from "@/app/actions/notifications";
import { cn, formatRelative } from "@/app/lib/utils";

export function Notifications({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const queryKey = ["notifications", userId];

  const { data: notifications = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  useRealtimeNotifications(userId, {
    onInsert: (n) => toast(n.message ? `${n.title} — ${n.message}` : n.title, { duration: 5000 }),
    onChange: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const unread = notifications.filter((n) => !n.is_read).length;

  function markRead(ids?: string[]) {
    startTransition(async () => {
      const res = await markNotificationsReadAction(ids);
      if (!res.ok) toast.error(res.error);
      await queryClient.invalidateQueries({ queryKey });
    });
  }

  function open(n: Notification) {
    if (!n.is_read) markRead([n.id]);
    if (n.link) router.push(n.link);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
          <Bell className="size-5" />
          {unread > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]">{unread > 9 ? "9+" : unread}</Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
          <span className="font-semibold">Notifications</span>
          {unread > 0 && (
            <Button variant="ghost" size="xs" disabled={pending} onClick={() => markRead()}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</div>
        ) : (
          <ScrollArea className="h-80">
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => open(n)}
                    className={cn(
                      "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                      !n.is_read && "bg-primary/5",
                    )}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{n.title}</span>
                      {n.message && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>}
                      <span className="mt-1 block text-[11px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/dashboard/history">View activity history</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
