import Link from "next/link";
import { Boxes } from "lucide-react";
import { cn } from "@/app/lib/utils";

export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="UCOMMERZ home">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Boxes className="size-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-lg font-extrabold tracking-tight", invert ? "text-white" : "text-foreground")}>UCOMMERZ</span>
        <span className={cn("text-[10px] font-medium uppercase tracking-[0.2em]", invert ? "text-white/60" : "text-muted-foreground")}>
          Service Marketplace
        </span>
      </span>
    </Link>
  );
}
