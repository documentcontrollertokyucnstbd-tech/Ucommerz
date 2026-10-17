"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BellRing, Check, Loader2, Play, ShieldAlert, X, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import { BOOKING_STATUSES, PROVIDER_BOOKING_TRANSITIONS, SEEKER_BOOKING_TRANSITIONS, type BookingStatus } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { updateBookingStatusAction } from "@/app/actions/bookings";
import { toastAction } from "@/app/lib/toast-action";

type Side = "provider" | "seeker" | "admin";

const META: Record<BookingStatus, { label: string; icon: typeof Check; variant: "default" | "outline" | "destructive" }> = {
  PENDING: { label: "Pending", icon: Check, variant: "outline" },
  CONFIRMED: { label: "Accept", icon: Check, variant: "default" },
  IN_PROGRESS: { label: "Start", icon: Play, variant: "default" },
  COMPLETED: { label: "Mark completed", icon: CheckCheck, variant: "default" },
  CANCELLED: { label: "Cancel", icon: X, variant: "destructive" },
  DISPUTED: { label: "Open dispute", icon: ShieldAlert, variant: "outline" },
};

export function BookingActions({ bookingId, status, side, canRemind }: { bookingId: string; status: BookingStatus; side: Side; canRemind?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<BookingStatus | null>(null);
  const [reason, setReason] = useState("");

  const allowed: BookingStatus[] =
    side === "admin" ? BOOKING_STATUSES.filter((s) => s !== status) : side === "provider" ? PROVIDER_BOOKING_TRANSITIONS[status] : SEEKER_BOOKING_TRANSITIONS[status];

  async function run(next: BookingStatus, why?: string) {
    setBusy(next);
    const res = await toastAction(updateBookingStatusAction({ booking_id: bookingId, status: next, reason: why ?? "" }));
    setBusy(null);
    if (res.ok) {
      setDialog(null);
      setReason("");
      router.refresh();
    }
  }

  async function remind() {
    setBusy("remind");
    try {
      const res = await fetch("/api/bookings/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && json.ok) toast.success(json.message ?? "Reminder sent.");
      else toast.error(json.error ?? "Could not send the reminder.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (allowed.length === 0 && !canRemind) return null;

  const needsReason = (s: BookingStatus) => s === "CANCELLED" || s === "DISPUTED";

  return (
    <div className="flex flex-wrap gap-2">
      {allowed.map((s) => {
        const m = META[s];
        const Icon = m.icon;
        const label = s === "CANCELLED" && side === "provider" && status === "PENDING" ? "Decline" : m.label;
        return (
          <Button key={s} type="button" variant={m.variant} size="sm" disabled={busy !== null} onClick={() => (needsReason(s) ? setDialog(s) : run(s))}>
            {busy === s ? <Loader2 className="animate-spin" /> : <Icon />} {label}
          </Button>
        );
      })}
      {canRemind && (
        <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={remind}>
          {busy === "remind" ? <Loader2 className="animate-spin" /> : <BellRing />} Send reminder
        </Button>
      )}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "DISPUTED" ? "Open a dispute" : "Cancel this booking?"}</DialogTitle>
            <DialogDescription>{dialog === "DISPUTED" ? "Describe the problem. Our team will review it." : "Let the other party know why (optional)."}</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason…" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>Back</Button>
            <Button type="button" variant={dialog === "CANCELLED" ? "destructive" : "default"} disabled={busy !== null || (dialog === "DISPUTED" && reason.trim().length < 5)} onClick={() => dialog && run(dialog, reason)}>
              {busy && <Loader2 className="animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
