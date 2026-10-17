"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Loader2, Pause, Pencil, Play, Trash2 } from "lucide-react";
import type { ServiceStatus } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { deleteServiceAction, setServiceStatusAction } from "@/app/actions/services";
import { toastAction } from "@/app/lib/toast-action";

export function ServiceRowActions({ id, status, title }: { id: string; status: ServiceStatus; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await toastAction(setServiceStatusAction(id, status === "ACTIVE" ? "INACTIVE" : "ACTIVE"));
    setBusy(false);
    if (res.ok) router.refresh();
  }
  async function remove() {
    setBusy(true);
    const res = await toastAction(deleteServiceAction(id));
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button asChild variant="ghost" size="icon-sm" aria-label="View"><Link href={`/services/${id}`}><Eye /></Link></Button>
      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit"><Link href={`/dashboard/my-services/${id}/edit`}><Pencil /></Link></Button>
      {(status === "ACTIVE" || status === "INACTIVE") && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={toggle} disabled={busy} aria-label={status === "ACTIVE" ? "Pause" : "Activate"}>
          {busy ? <Loader2 className="animate-spin" /> : status === "ACTIVE" ? <Pause /> : <Play />}
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label="Delete"><Trash2 /></Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the service and its reviews. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
