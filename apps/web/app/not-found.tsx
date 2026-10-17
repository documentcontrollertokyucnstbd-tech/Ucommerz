import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Compass className="size-7" /></span>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-6 flex gap-3">
        <Button asChild><Link href="/">Back home</Link></Button>
        <Button asChild variant="outline"><Link href="/browse">Browse services</Link></Button>
      </div>
    </div>
  );
}
