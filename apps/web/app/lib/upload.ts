"use client";

import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_MB,
  type StorageBucket,
} from "@ucommerz/shared";
import { createClient } from "@/app/lib/supabase/client";

export type UploadOptions = {
  bucket: StorageBucket;
  /** Auth user id: files are stored under <bucket>/<userId>/..., enforced by storage RLS. */
  userId: string;
  allowPdf?: boolean;
  maxMb?: number;
};

export function validateFile(file: File, opts: Pick<UploadOptions, "allowPdf" | "maxMb"> = {}): string | null {
  const maxMb = opts.maxMb ?? MAX_UPLOAD_MB;
  const allowed: readonly string[] = opts.allowPdf ? ALLOWED_DOCUMENT_TYPES : ALLOWED_IMAGE_TYPES;
  if (!allowed.includes(file.type)) {
    return opts.allowPdf ? "Only JPG, PNG, WebP, GIF or PDF files are allowed." : "Only JPG, PNG, WebP or GIF images are allowed.";
  }
  if (file.size > maxMb * 1024 * 1024) return `File is too large (max ${maxMb} MB).`;
  return null;
}

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[file.type] ?? "bin";
}

/** Uploads a file to Supabase Storage and returns its public URL. Throws Error with a readable message. */
export async function uploadFile(file: File, opts: UploadOptions): Promise<string> {
  const problem = validateFile(file, opts);
  if (problem) throw new Error(problem);

  const supabase = createClient();
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  const path = `${opts.userId}/${id}.${extensionOf(file)}`;

  const { error } = await supabase.storage.from(opts.bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Removes a previously uploaded file given its public URL (best effort). */
export async function deleteFileByUrl(url: string, bucket: StorageBucket): Promise<void> {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    await createClient().storage.from(bucket).remove([path]);
  } catch {
    /* ignore */
  }
}
