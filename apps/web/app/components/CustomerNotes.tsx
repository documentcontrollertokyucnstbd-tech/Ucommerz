"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { CustomerNote } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { deleteCustomerNoteAction, saveCustomerNoteAction } from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";
import { formatDateTime } from "@/app/lib/utils";

export function CustomerNotes({ customerId, notes }: { customerId: string; notes: CustomerNote[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Private notes — only you can see these." />
        <Button
          type="button"
          size="sm"
          disabled={busy || text.trim().length < 2}
          onClick={async () => {
            setBusy(true);
            const r = await toastAction(saveCustomerNoteAction({ customer_id: customerId, note: text }));
            setBusy(false);
            if (r.ok) { setText(""); router.refresh(); }
          }}
        >
          {busy && <Loader2 className="animate-spin" />} Add note
        </Button>
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
            <div><p className="whitespace-pre-line">{n.note}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p></div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete note" className="text-muted-foreground hover:text-destructive" onClick={async () => { const r = await toastAction(deleteCustomerNoteAction(n.id, customerId)); if (r.ok) router.refresh(); }}><Trash2 /></Button>
          </li>
        ))}
        {notes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
      </ul>
    </div>
  );
}
