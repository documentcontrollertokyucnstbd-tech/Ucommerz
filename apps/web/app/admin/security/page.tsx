import type { Metadata } from "next";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { requireSuperAdmin } from "@/app/lib/guards";
import { hasServiceRole } from "@/app/lib/supabase/admin";
import { isEmailConfigured } from "@/app/lib/email-service";
import { formatDateTime } from "@/app/lib/utils";
import { PageHeader } from "@/app/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import type { AdminLog } from "@ucommerz/shared";

export const metadata: Metadata = { title: "Security" };

const csv = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export default async function SecurityPage() {
  const { supabase } = await requireSuperAdmin();
  const [suspended, admins, recent] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("users").select("id, full_name, email").in("role", ["ADMIN", "SUPERADMIN"]),
    supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  const whitelist = csv(process.env.ADMIN_IP_WHITELIST);
  const blacklist = csv(process.env.ADMIN_IP_BLACKLIST);
  const checks = [
    { ok: hasServiceRole(), label: "Service role key configured", hint: "Needed for role changes, user deletion, auto-confirm and cron." },
    { ok: Boolean(process.env.SESSION_SECRET), label: "SESSION_SECRET set", hint: "Protects the reminder cron endpoint." },
    { ok: isEmailConfigured(), label: "Resend API key configured", hint: "Transactional emails." },
    { ok: process.env.ENFORCE_ADMIN_IP_WHITELIST === "true" && whitelist.length > 0, label: "Admin IP allow-list enforced", hint: "Set ENFORCE_ADMIN_IP_WHITELIST=true and ADMIN_IP_WHITELIST=ip1,ip2." },
  ];
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Security" description="Hardening status and recent administrative activity." />
      <Card>
        <CardHeader><CardTitle className="text-base">Checklist</CardTitle><CardDescription>Configuration that affects platform security.</CardDescription></CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 text-sm">
                {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />}
                <div><p className="font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.hint}</p></div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Access control</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Suspended accounts:</span> {suspended.count ?? 0}</p>
            <p><span className="text-muted-foreground">Blocked admin IPs:</span> {blacklist.length}</p>
            <p><span className="text-muted-foreground">Allow-listed admin IPs:</span> {whitelist.length}</p>
            <p className="pt-1 text-xs text-muted-foreground">API requests are rate-limited per IP; Server Actions apply additional per-action limits. Row Level Security is enabled on every table.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4" /> Administrators</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {((admins.data as { id: string; full_name: string | null; email: string }[] | null) ?? []).map((a) => <li key={a.id}>{a.full_name ?? a.email} <span className="text-xs text-muted-foreground">{a.email}</span></li>)}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent admin actions</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {((recent.data as AdminLog[] | null) ?? []).map((l) => <li key={l.id} className="flex justify-between py-2"><span>{l.action.replace(/_/g, " ").toLowerCase()} <span className="text-xs text-muted-foreground">· {l.ip_address ?? "—"}</span></span><span className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span></li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
