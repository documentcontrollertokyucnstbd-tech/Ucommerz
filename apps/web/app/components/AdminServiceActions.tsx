"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ExternalLink, Loader2, MoreHorizontal, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import type { ServiceStatus } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { adminDeleteServiceAction, moderateServiceAction, setServiceFeaturedAction } from "@/app/actions/admin";
import { toastAction } from "@/app/lib/toast-action";

export function AdminServiceActions({ id, status, featured }: { id: string; status: ServiceStatus; featured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  async function run(p: Promise<{ ok: boolean }>) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (r.ok) { setRejecting(false); setNote(""); router.refresh(); }
  }

  return (
    <div className="flex items-center gap-1">
      {status === "PENDING" && (
        <>
          <Button type="button" size="sm" disabled={busy} onClick={() => run(toastAction(moderateServiceAction(id, "ACTIVE")))}><Check /> Approve</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}><X /> Reject</Button>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label="More actions" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/services/${id}`}><ExternalLink /> View page</Link></DropdownMenuItem>
          {status === "ACTIVE" && <DropdownMenuItem onSelect={() => run(toastAction(setServiceFeaturedAction(id, !featured)))}><Star /> {featured ? "Remove featured" : "Feature"}</DropdownMenuItem>}
          {status !== "ACTIVE" && status !== "PENDING" && <DropdownMenuItem onSelect={() => run(toastAction(moderateServiceAction(id, "ACTIVE")))}><Check /> Approve / activate</DropdownMenuItem>}
          {status === "ACTIVE" && <DropdownMenuItem onSelect={() => run(toastAction(moderateServiceAction(id, "INACTIVE")))}><X /> Deactivate</DropdownMenuItem>}
          {status !== "REJECTED" && status !== "PENDING" && <DropdownMenuItem onSelect={() => setRejecting(true)}><X /> Reject…</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => { if (window.confirm("Delete this service permanently?")) void run(toastAction(adminDeleteServiceAction(id))); }}><Trash2 /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject service</DialogTitle><DialogDescription>The provider will be notified with your reason.</DialogDescription></DialogHeader>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs to change?" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejecting(false)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => run(toastAction(moderateServiceAction(id, "REJECTED", note)))}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
