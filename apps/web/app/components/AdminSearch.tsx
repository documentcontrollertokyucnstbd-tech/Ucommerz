"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";

/** Small GET-style search box that keeps the other query params. */
export function AdminSearch({ basePath, params, placeholder }: { basePath: string; params: Record<string, string | undefined>; placeholder?: string }) {
  const t = useTranslations("AdmSearch");
  const router = useRouter();
  const [q, setQ] = useState(params.q ?? "");
  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries({ ...params, q: q.trim() || undefined, page: undefined })) if (v) sp.set(k, v);
        const s = sp.toString();
        router.push(`${basePath}${s ? `?${s}` : ""}`);
      }}
    >
      <div className="relative flex-1 sm:w-72 sm:flex-none">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? t("placeholder")} className="ps-9" aria-label={t("label")} />
      </div>
      <Button type="submit" variant="outline">{t("submit")}</Button>
    </form>
  );
}
