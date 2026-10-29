"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, X } from "lucide-react";
import { STORAGE_BUCKETS } from "@ucommerz/shared";
import { uploadFile, validateFile } from "@/app/lib/upload";

export function PortfolioUpload({ userId, value, onChange, max = 6 }: { userId: string; value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const t = useTranslations("DashProvider.portfolioUpload");
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list).slice(0, max - value.length);
    for (const f of files) {
      const p = validateFile(f);
      if (p) return void toast.error(`${f.name}: ${p}`);
    }
    setBusy(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadFile(f, { bucket: STORAGE_BUCKETS.portfolio, userId })));
      onChange([...value, ...urls].slice(0, max));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((u) => (
        <div key={u} className="relative size-20 overflow-hidden rounded-lg border">
          <img src={u} alt={t("alt")} className="size-full object-cover" />
          <button type="button" aria-label={t("remove")} onClick={() => onChange(value.filter((x) => x !== u))} className="absolute end-1 top-1 rounded-full bg-black/70 p-0.5 text-white"><X className="size-3" /></button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground transition hover:border-primary hover:text-primary" aria-label={t("add")}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        </button>
      )}
      <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => pick(e.target.files)} aria-label={t("aria")} />
    </div>
  );
}
