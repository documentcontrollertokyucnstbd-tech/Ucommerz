"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { STORAGE_BUCKETS } from "@ucommerz/shared";
import { uploadFile, validateFile } from "@/app/lib/upload";
import { updateAvatarAction } from "@/app/actions/auth";
import { toastAction } from "@/app/lib/toast-action";
import { avatarOf } from "@/app/lib/media";
import { initials } from "@/app/lib/utils";
import toast from "react-hot-toast";

export function AvatarUpload({ userId, name, url }: { userId: string; name: string | null; url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = validateFile(file, { maxMb: 3 });
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const publicUrl = await uploadFile(file, { bucket: STORAGE_BUCKETS.avatars, userId, maxMb: 3 });
      const res = await toastAction(updateAvatarAction(publicUrl));
      if (res.ok) router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    const res = await toastAction(updateAvatarAction(null));
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        <AvatarImage src={avatarOf(url)} alt={name ?? "Profile photo"} />
        <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload profile photo" />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Camera />} Change photo
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
            <Trash2 /> Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · max 3 MB</p>
      </div>
    </div>
  );
}
