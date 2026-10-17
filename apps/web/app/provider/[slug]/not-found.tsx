import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function ProviderNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <SearchX className="mb-3 size-10 text-muted-foreground" />
      <h1 className="font-display text-2xl font-bold">Provider not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">This profile does not exist or is no longer available.</p>
      <Button asChild className="mt-5"><Link href="/browse">Browse services</Link></Button>
    </div>
  );
}
