"use client";

import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { deletePackageAction, togglePackageAction } from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";

export function PackageRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  return (
    <div className="flex gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={async () => { const r = await toastAction(togglePackageAction(id, !active)); if (r.ok) router.refresh(); }}>
        {active ? <Pause /> : <Play />} {active ? "Pause" : "Activate"}
      </Button>
      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => { if (!window.confirm("Delete this package?")) return; const r = await toastAction(deletePackageAction(id)); if (r.ok) router.refresh(); }}>
        <Trash2 /> Delete
      </Button>
    </div>
  );
}
