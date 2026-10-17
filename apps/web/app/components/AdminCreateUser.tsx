"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { USER_ROLES } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { createUserAction } from "@/app/actions/admin";
import { toastAction } from "@/app/lib/toast-action";

const LABELS: Record<string, string> = { SEEKER: "Service taker (customer)", PROVIDER: "Service provider", BOTH: "Customer & provider", ADMIN: "Admin (moderator)", SUPERADMIN: "Super admin" };

export function AdminCreateUser() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "SEEKER" });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await toastAction(createUserAction(form));
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "SEEKER" });
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm"><UserPlus /> Add user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>Creates a confirmed account. Share the password with the user securely.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2"><Label htmlFor="cu-name">Full name</Label><Input id="cu-name" value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} required /></div>
          <div className="grid gap-2"><Label htmlFor="cu-email">Email</Label><Input id="cu-email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} required /></div>
          <div className="grid gap-2"><Label htmlFor="cu-pass">Password</Label><Input id="cu-pass" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => set({ password: e.target.value })} required /></div>
          <div className="grid gap-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => set({ role: v })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((r) => <SelectItem key={r} value={r}>{LABELS[r] ?? r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Create account</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
