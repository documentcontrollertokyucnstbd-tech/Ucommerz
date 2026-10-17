"use client";

import { useEffect, useRef } from "react";
import type { Notification } from "@ucommerz/shared";
import { useSupabase } from "@/app/hooks/useSupabase";

type Handlers = {
  onInsert?: (n: Notification) => void;
  onChange?: () => void;
};

/**
 * Subscribes to the signed-in user's notifications via Supabase Realtime.
 * `onInsert` fires for brand-new rows, `onChange` for any insert/update/delete.
 */
export function useRealtimeNotifications(userId: string | null | undefined, handlers: Handlers) {
  const supabase = useSupabase();
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "INSERT") ref.current.onInsert?.(payload.new as Notification);
          ref.current.onChange?.();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
}
