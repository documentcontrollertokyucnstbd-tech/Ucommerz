"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Heart } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { toggleFavoriteAction } from "@/app/actions/favorites";
import { cn } from "@/app/lib/utils";

export function FavoriteButton({
  serviceId,
  initialFavorite,
  variant = "default",
  className,
}: {
  serviceId: string;
  initialFavorite: boolean;
  variant?: "default" | "floating";
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const previous = favorite;
    setFavorite(!previous); // optimistic
    startTransition(async () => {
      try {
        const res = await toggleFavoriteAction(serviceId);
        if (!res.ok) {
          setFavorite(previous);
          if (res.error === "AUTH_REQUIRED") {
            toast.error("Please sign in to save favorites.");
            router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
          } else {
            toast.error(res.error);
          }
          return;
        }
        setFavorite(Boolean(res.data?.favorite));
        if (res.message) toast.success(res.message);
      } catch {
        setFavorite(previous);
        toast.error("Couldn't update favorites. Please try again.");
      }
    });
  }

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorite}
        aria-label={favorite ? "Remove from favorites" : "Save to favorites"}
        className={cn(
          "glass flex size-9 items-center justify-center rounded-full transition hover:scale-105 disabled:opacity-60",
          className,
        )}
      >
        <Heart className={cn("size-4", favorite ? "fill-rose-500 text-rose-500" : "text-foreground")} />
      </button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} disabled={pending} aria-pressed={favorite} className={className}>
      <Heart className={cn(favorite && "fill-rose-500 text-rose-500")} />
      {favorite ? "Saved" : "Save"}
    </Button>
  );
}
