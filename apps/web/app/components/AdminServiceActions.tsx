"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("AdmServiceActions");
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
          <Button type="button" size="sm" disabled={busy} onClick={() => run(toastAction(moderateServiceAction(id, "ACTIVE")))}><Check /> {t("approve")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}><X /> {t("reject")}</Button>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon-sm" aria-label={t("moreActions")} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/services/${id}`}><ExternalLink /> {t("viewPage")}</Link></DropdownMenuItem>
          {status === "ACTIVE" && <DropdownMenuItem onSelect={() => run(toastAction(setServiceFeaturedAction(id, !featured)))}><Star /> {featured ? t("removeFeatured") : t("feature")}</DropdownMenuItem>}
          {status !== "ACTIVE" && status !== "PENDING" && <DropdownMenuItem onSelect={() => run(toastAction(moderateServiceAction(id, "ACTIVE")))}><Check /> {t("approveActivate")}</DropdownMenuItem>}
          {status === "ACTIVE" && <DropdownMenuItem onSelect={() => run(toastAction(moderateServiceAction(id, "INACTIVE")))}><X /> {t("deactivate")}</DropdownMenuItem>}
          {status !== "REJECTED" && status !== "PENDING" && <DropdownMenuItem onSelect={() => setRejecting(true)}><X /> {t("rejectEllipsis")}</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => { if (window.confirm(t("confirmDelete"))) void run(toastAction(adminDeleteServiceAction(id))); }}><Trash2 /> {t("delete")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("rejectTitle")}</DialogTitle><DialogDescription>{t("rejectDescription")}</DialogDescription></DialogHeader>
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("rejectPlaceholder")} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejecting(false)}>{t("cancel")}</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => run(toastAction(moderateServiceAction(id, "REJECTED", note)))}>{t("reject")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
