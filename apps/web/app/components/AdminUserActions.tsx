"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BadgeCheck, Ban, CheckCircle2, LayoutDashboard, Loader2, MoreHorizontal, ShieldCheck, Trash2 } from "lucide-react";
import { USER_ROLES } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { deleteUserAction, setUserActiveAction, setUserRoleAction, setUserVerifiedAction } from "@/app/actions/admin";
import { toastAction } from "@/app/lib/toast-action";

export function AdminUserActions({ id, name, role, isActive, verified, isSelf, targetIsStaff, viewerIsSuper }: { id: string; name: string; role: string; isActive: boolean; verified: boolean; isSelf: boolean; targetIsStaff: boolean; viewerIsSuper: boolean }) {
  const router = useRouter();
  const t = useTranslations("AdmUserActions");
  const tRole = useTranslations("Role");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(p: Promise<{ ok: boolean }>) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("actionsFor", { name })} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!targetIsStaff && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${id}`}><LayoutDashboard /> {t("viewDashboard")}</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => run(toastAction(setUserVerifiedAction(id, !verified)))}>
            {verified ? <><BadgeCheck /> {t("removeVerification")}</> : <><CheckCircle2 /> {t("verifyUser")}</>}
          </DropdownMenuItem>
          {!isSelf && (viewerIsSuper || !targetIsStaff) && (
            <DropdownMenuItem onSelect={() => run(toastAction(setUserActiveAction(id, !isActive)))}>
              {isActive ? <><Ban /> {t("suspend")}</> : <><CheckCircle2 /> {t("reactivate")}</>}
            </DropdownMenuItem>
          )}
          {viewerIsSuper && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t("changeRole")}</DropdownMenuLabel>
              {USER_ROLES.filter((r) => r !== role).map((r) => (
                <DropdownMenuItem key={r} onSelect={() => run(toastAction(setUserRoleAction(id, r)))}><ShieldCheck /> {t("makeRole", { role: tRole(r) })}</DropdownMenuItem>
              ))}
            </>
          )}
          {!isSelf && viewerIsSuper && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}><Trash2 /> {t("deleteUser")}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteTitle", { name })}</AlertDialogTitle><AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => run(toastAction(deleteUserAction(id)))}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
