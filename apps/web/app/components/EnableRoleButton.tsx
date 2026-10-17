"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { enableRoleAction } from "@/app/actions/auth";
import { toastAction } from "@/app/lib/toast-action";

export function EnableRoleButton({ target, label }: { target: "PROVIDER" | "SEEKER"; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await toastAction(enableRoleAction(target), target === "PROVIDER" ? "Provider tools enabled!" : "Customer features enabled!");
        setBusy(false);
        if (res.ok) {
          router.push(res.data?.redirectTo ?? "/dashboard");
          router.refresh();
        }
      }}
    >
      {busy && <Loader2 className="animate-spin" />} {label}
    </Button>
  );
}
