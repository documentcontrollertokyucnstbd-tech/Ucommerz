"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@ucommerz/shared";
import { useSupabase } from "@/app/hooks/useSupabase";

type Handlers = {
  /** A message addressed to the current user arrived. */
  onIncoming?: (m: Message) => void;
  /** One of the current user's sent messages was updated (e.g. marked read). */
  onSentUpdated?: (m: Message) => void;
};

/** Supabase Realtime subscription for chat. Cleans up on unmount. */
export function useRealtimeMessages(userId: string | null | undefined, handlers: Handlers) {
  const supabase = useSupabase();
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        (payload) => ref.current.onIncoming?.(payload.new as Message),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${userId}` },
        (payload) => ref.current.onSentUpdated?.(payload.new as Message),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);
}
