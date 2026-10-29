"use client";

import { Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Button } from "@/app/components/ui/button";

type Props = {
  title: string;
  text?: string;
  /** Absolute URL or a path like "/services/123". Defaults to the current page. */
  url?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm";
  className?: string;
};

/** Web Share API with a clipboard fallback and toast feedback. */
export function ShareButton({ title, text, url, label: labelProp, variant = "outline", size = "sm", className }: Props) {
  const t = useTranslations("PubShare");
  const label = labelProp ?? t("label");
  async function share() {
    const shareUrl = url
      ? url.startsWith("http")
        ? url
        : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`
      : window.location.href;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (error) {
        // The user dismissing the native sheet is not an error.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={share} aria-label={label}>
      <Share2 />
      {size !== "icon" && size !== "icon-sm" && label}
    </Button>
  );
}
