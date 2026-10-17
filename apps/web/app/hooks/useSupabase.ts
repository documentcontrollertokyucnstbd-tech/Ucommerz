"use client";

import { useMemo } from "react";
import { createClient } from "@/app/lib/supabase/client";

/** Stable browser Supabase client for Client Components. */
export function useSupabase() {
  return useMemo(() => createClient(), []);
}
