"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Reply } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { respondToReviewAction } from "@/app/actions/reviews";
import { toastAction } from "@/app/lib/toast-action";

export function ReviewResponseForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Reply /> Respond
      </Button>
    );
  }
  return (
    <div className="mt-2 space-y-2">
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a public response…" />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || text.trim().length < 2}
          onClick={async () => {
            setBusy(true);
            const res = await toastAction(respondToReviewAction({ review_id: reviewId, response: text.trim() }));
            setBusy(false);
            if (res.ok) {
              setOpen(false);
              router.refresh();
            }
          }}
        >
          {busy && <Loader2 className="animate-spin" />} Publish response
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
