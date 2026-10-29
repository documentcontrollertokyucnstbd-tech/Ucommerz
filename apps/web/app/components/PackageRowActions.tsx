"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { deletePackageAction, togglePackageAction } from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";

export function PackageRowActions({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("DashPackages.row");
  const router = useRouter();
  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={async () => { const r = await toastAction(togglePackageAction(id, !active)); if (r.ok) router.refresh(); }}>
        {active ? <Pause /> : <Play />} {active ? t("pause") : t("activate")}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => { if (!window.confirm(t("confirmDelete"))) return; const r = await toastAction(deletePackageAction(id)); if (r.ok) router.refresh(); }}>
        <Trash2 /> {t("delete")}
      </Button>
    </div>
  );
}
