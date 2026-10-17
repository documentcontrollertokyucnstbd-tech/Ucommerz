"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CheckCheck, Loader2, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { updatePackageBookingStatusAction } from "@/app/actions/bookings";
import { toastAction } from "@/app/lib/toast-action";

export function PackageBookingActions({ id, status, side }: { id: string; status: string; side: "provider" | "seeker" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  async function run(next: string) {
    setBusy(next);
    const res = await toastAction(updatePackageBookingStatusAction(id, next), "Package booking updated.");
    setBusy(null);
    if (res.ok) router.refresh();
  }
  const btn = (s: string, label: string, Icon: typeof Check, variant: "default" | "outline" | "destructive" = "outline") => (
    <Button key={s} type="button" size="sm" variant={variant} disabled={busy !== null} onClick={() => run(s)}>
      {busy === s ? <Loader2 className="animate-spin" /> : <Icon />} {label}
    </Button>
  );
  if (side === "provider") {
    if (status === "PENDING") return <div className="flex gap-2">{btn("CONFIRMED", "Accept", Check, "default")}{btn("CANCELLED", "Decline", X)}</div>;
    if (status === "CONFIRMED" || status === "IN_PROGRESS") return <div className="flex gap-2">{btn("COMPLETED", "Complete", CheckCheck, "default")}{btn("CANCELLED", "Cancel", X)}</div>;
    return null;
  }
  if (status === "PENDING" || status === "CONFIRMED") return btn("CANCELLED", "Cancel", X);
  return null;
}
