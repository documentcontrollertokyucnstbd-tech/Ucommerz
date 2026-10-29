"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { resolveReportAction } from "@/app/actions/admin";
import { toastAction } from "@/app/lib/toast-action";

type Status = "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

export function ReportResolver({ reportId, status, notes }: { reportId: string; status: string; notes: string | null }) {
  const router = useRouter();
  const t = useTranslations("AdmReportResolver");
  const [text, setText] = useState(notes ?? "");
  const [busy, setBusy] = useState<Status | null>(null);
  const closed = status === "RESOLVED" || status === "DISMISSED";

  async function run(next: Status) {
    setBusy(next);
    const res = await toastAction(resolveReportAction({ report_id: reportId, status: next, resolution_notes: text }));
    setBusy(null);
    if (res.ok) router.refresh();
  }

  if (closed) return notes ? <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{t("notesLabel")}</span> {notes}</p> : null;

  return (
    <div className="space-y-2">
      <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("notesPlaceholder")} />
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" && <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => run("UNDER_REVIEW")}>{busy === "UNDER_REVIEW" ? <Loader2 className="animate-spin" /> : <Eye />} {t("startReview")}</Button>}
        <Button type="button" size="sm" disabled={busy !== null} onClick={() => run("RESOLVED")}>{busy === "RESOLVED" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t("resolve")}</Button>
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => run("DISMISSED")}>{busy === "DISMISSED" ? <Loader2 className="animate-spin" /> : <XCircle />} {t("dismiss")}</Button>
      </div>
    </div>
  );
}
