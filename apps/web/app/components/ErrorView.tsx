"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function ErrorView({ error, reset, homeHref = "/", homeLabel = "Go home" }: { error: Error & { digest?: string }; reset: () => void; homeHref?: string; homeLabel?: string }) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="size-7" /></span>
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred. You can try again, or head back.</p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}><RotateCcw /> Try again</Button>
        <Button asChild variant="outline"><Link href={homeHref}>{homeLabel}</Link></Button>
      </div>
    </div>
  );
}
