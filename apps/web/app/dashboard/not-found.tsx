import Link from "next/link";
import { Button } from "@/app/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">That item doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Button asChild className="mt-5"><Link href="/dashboard">Back to dashboard</Link></Button>
    </div>
  );
}
