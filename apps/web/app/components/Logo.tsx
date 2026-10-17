import Link from "next/link";
import { cn } from "@/app/lib/utils";

export function Logo({ className, invert = false }: { className?: string; invert?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="UCOMMERZ home">
      <img src="/logo.svg" alt="" width={36} height={36} className="size-9 rounded-lg shadow-sm" />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-lg font-extrabold tracking-tight", invert ? "text-white" : "text-foreground")}>UCOMMERZ</span>
        <span className={cn("text-[10px] font-medium uppercase tracking-[0.2em]", invert ? "text-white/60" : "text-muted-foreground")}>
          Service Marketplace
        </span>
      </span>
    </Link>
  );
}
