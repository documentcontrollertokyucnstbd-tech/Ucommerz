"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { createPackageBookingAction } from "@/app/actions/bookings";
import { toastAction } from "@/app/lib/toast-action";

export function BookPackageButton({ packageId, title, state }: { packageId: string; title: string; state: "guest" | "owner" | "ready" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (state === "owner") return null;

  async function submit() {
    if (!when) return;
    setBusy(true);
    const res = await toastAction(createPackageBookingAction({ package_id: packageId, booking_date: new Date(when).toISOString(), notes }), "Package requested!");
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.push("/dashboard/bookings?tab=packages");
      router.refresh();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o && state === "guest") {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" type="button"><Package /> Book package</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book “{title}”</DialogTitle>
          <DialogDescription>Choose when you&apos;d like to start. The provider will confirm your request.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pkg-when">Preferred date & time</Label>
            <Input id="pkg-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pkg-notes">Notes (optional)</Label>
            <Textarea id="pkg-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={submit} disabled={busy || !when}>
            {busy && <Loader2 className="animate-spin" />} Request package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
