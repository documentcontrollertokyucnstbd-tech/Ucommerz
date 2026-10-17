"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileCheck2, Loader2, Upload, X } from "lucide-react";
import { STORAGE_BUCKETS } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { uploadFile, validateFile } from "@/app/lib/upload";

/** Uploads a certificate image/PDF to the `certificates` bucket and reports its public URL. */
export function CertificateUpload({ userId, value, onChange }: { userId: string; value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    const problem = validateFile(file, { allowPdf: true });
    if (problem) return void toast.error(problem);
    setBusy(true);
    try {
      onChange(await uploadFile(file, { bucket: STORAGE_BUCKETS.certificates, userId, allowPdf: true }));
      toast.success("Certificate uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Upload certificate" />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />} {value ? "Replace file" : "Upload file"}
      </Button>
      {value && (
        <>
          <a href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><FileCheck2 className="size-4" /> View</a>
          <button type="button" aria-label="Remove file" onClick={() => onChange("")}><X className="size-4 text-muted-foreground" /></button>
        </>
      )}
    </div>
  );
}
