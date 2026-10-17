"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${name}`} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!targetIsStaff && (
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${id}`}><LayoutDashboard /> View dashboard</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => run(toastAction(setUserVerifiedAction(id, !verified)))}>
            {verified ? <><BadgeCheck /> Remove verification</> : <><CheckCircle2 /> Verify user</>}
          </DropdownMenuItem>
          {!isSelf && (viewerIsSuper || !targetIsStaff) && (
            <DropdownMenuItem onSelect={() => run(toastAction(setUserActiveAction(id, !isActive)))}>
              {isActive ? <><Ban /> Suspend</> : <><CheckCircle2 /> Reactivate</>}
            </DropdownMenuItem>
          )}
          {viewerIsSuper && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Change role</DropdownMenuLabel>
              {USER_ROLES.filter((r) => r !== role).map((r) => (
                <DropdownMenuItem key={r} onSelect={() => run(toastAction(setUserRoleAction(id, r)))}><ShieldCheck /> Make {r === "SUPERADMIN" ? "super admin" : r.toLowerCase()}</DropdownMenuItem>
              ))}
            </>
          )}
          {!isSelf && viewerIsSuper && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}><Trash2 /> Delete user</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {name}?</AlertDialogTitle><AlertDialogDescription>This permanently removes the account and everything tied to it (services, bookings, messages). This can&apos;t be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => run(toastAction(deleteUserAction(id)))}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
