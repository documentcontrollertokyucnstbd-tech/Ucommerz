"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { useSupabase } from "@/app/hooks/useSupabase";
import { avatarOf } from "@/app/lib/media";
import { initials, sanitizeSearch } from "@/app/lib/utils";

export type PickedUser = { id: string; full_name: string | null; avatar_url: string | null };

export function UserSearchDialog({ meId, onPick }: { meId: string; onPick: (u: PickedUser) => void }) {
  const supabase = useSupabase();
  const t = useTranslations("AdmUserSearch");
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  const { data = [], isFetching } = useQuery({
    queryKey: ["user-search", debounced],
    enabled: open && debounced.length >= 2,
    queryFn: async () => {
      const q = sanitizeSearch(debounced);
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${q}%`)
        .eq("is_active", true)
        .neq("id", meId)
        .limit(8);
      if (error) throw error;
      return (data ?? []) as PickedUser[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline"><UserPlus /> {t("new")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus className="ps-9" placeholder={t("placeholder")} value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="min-h-24">
          {isFetching && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("searching")}</p>}
          {!isFetching && debounced.length >= 2 && data.length === 0 && <p className="text-sm text-muted-foreground">{t("noOne")}</p>}
          <ul className="space-y-1">
            {data.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(u);
                    setOpen(false);
                    setTerm("");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-start transition hover:bg-accent"
                >
                  <Avatar className="size-9"><AvatarImage src={avatarOf(u.avatar_url)} alt="" /><AvatarFallback>{initials(u.full_name)}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium">{u.full_name ?? t("user")}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
