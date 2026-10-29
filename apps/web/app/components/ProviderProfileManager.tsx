"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Award, Loader2, Plus, Trash2 } from "lucide-react";
import {
  SKILL_LEVELS,
  certificationSchema,
  portfolioSchema,
  skillSchema,
  type CertificationInput,
  type PortfolioInput,
  type ProviderCertification,
  type ProviderPortfolioItem,
  type ProviderSkill,
  type SkillInput,
} from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { CertificateUpload } from "@/app/components/CertificateUpload";
import { PortfolioUpload } from "@/app/components/PortfolioUpload";
import {
  addCertificationAction,
  addPortfolioAction,
  addSkillAction,
  deleteCertificationAction,
  deletePortfolioAction,
  deleteSkillAction,
} from "@/app/actions/provider";
import { toastAction } from "@/app/lib/toast-action";
import { useFormat } from "@/app/lib/use-format";

function RemoveButton({ onClick, label }: { onClick: () => Promise<unknown>; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} disabled={busy} className="text-muted-foreground hover:text-destructive" onClick={async () => { setBusy(true); await onClick(); setBusy(false); }}>
      {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}

/* ------------------------------------------------------------------ skills */
function SkillsSection({ skills }: { skills: ProviderSkill[] }) {
  const t = useTranslations("DashProvider.skills");
  const tr = useTranslations("DashProvider.remove");
  const router = useRouter();
  const form = useForm<SkillInput>({ resolver: zodResolver(skillSchema), defaultValues: { skill_name: "", skill_level: "INTERMEDIATE", years_experience: 1 } });
  async function onSubmit(v: SkillInput) {
    const res = await toastAction(addSkillAction(v));
    if (res.ok) { form.reset(); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("desc")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {skills.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span><span className="font-medium">{s.skill_name}</span> <span className="text-muted-foreground">{t("meta", { level: t(`levelsLower.${s.skill_level}`), years: s.years_experience })}</span></span>
              <RemoveButton label={tr("skill")} onClick={async () => { const r = await toastAction(deleteSkillAction(s.id)); if (r.ok) router.refresh(); }} />
            </li>
          ))}
          {skills.length === 0 && <li className="py-2 text-sm text-muted-foreground">{t("none")}</li>}
        </ul>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-[1fr_150px_100px_auto] sm:items-start" noValidate>
            <FormField control={form.control} name="skill_name" render={({ field }) => (<FormItem><FormLabel className="sr-only">{t("skill")}</FormLabel><FormControl><Input placeholder={t("ph")} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="skill_level" render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{SKILL_LEVELS.map((l) => <SelectItem key={l} value={l}>{t(`levels.${l}`)}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="years_experience" render={({ field }) => (<FormItem><FormControl><Input type="number" min={0} aria-label={t("years")} {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} {t("add")}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------- certifications */
function CertsSection({ certs, userId }: { certs: ProviderCertification[]; userId: string }) {
  const t = useTranslations("DashProvider.certs");
  const f = useFormat();
  const tr = useTranslations("DashProvider.remove");
  const router = useRouter();
  const form = useForm<CertificationInput>({ resolver: zodResolver(certificationSchema), defaultValues: { name: "", issuing_organization: "", issue_date: "", expiry_date: "", certificate_url: "" } });
  async function onSubmit(v: CertificationInput) {
    const res = await toastAction(addCertificationAction(v));
    if (res.ok) { form.reset(); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("desc")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {certs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-2"><Award className="size-4 text-primary" /><span><span className="font-medium">{c.name}</span> <span className="text-muted-foreground">{[c.issuing_organization, c.issue_date && f.date(c.issue_date)].filter(Boolean).join(" · ")}</span> {c.verified ? <span className="text-xs text-emerald-600">{t("verified")}</span> : <span className="text-xs text-muted-foreground">{t("pending")}</span>}</span></span>
              <RemoveButton label={tr("cert")} onClick={async () => { const r = await toastAction(deleteCertificationAction(c.id)); if (r.ok) router.refresh(); }} />
            </li>
          ))}
          {certs.length === 0 && <li className="py-2 text-sm text-muted-foreground">{t("none")}</li>}
        </ul>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2" noValidate>
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t("name")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issuing_organization" render={({ field }) => (<FormItem><FormLabel>{t("issuer")}</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issue_date" render={({ field }) => (<FormItem><FormLabel>{t("issued")}</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="expiry_date" render={({ field }) => (<FormItem><FormLabel>{t("expires")}</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="certificate_url" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>{t("file")}</FormLabel><CertificateUpload userId={userId} value={field.value ?? ""} onChange={field.onChange} /><FormMessage /></FormItem>
            )} />
            <div className="sm:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} {t("add")}</Button></div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- portfolio */
function PortfolioSection({ items, userId }: { items: ProviderPortfolioItem[]; userId: string }) {
  const t = useTranslations("DashProvider.portfolio");
  const tr = useTranslations("DashProvider.remove");
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const form = useForm<PortfolioInput>({ resolver: zodResolver(portfolioSchema), defaultValues: { title: "", description: "", project_url: "" } });
  async function onSubmit(v: PortfolioInput) {
    const res = await toastAction(addPortfolioAction({ ...v, image_urls: images }));
    if (res.ok) { form.reset(); setImages([]); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle><CardDescription>{t("desc")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-lg border p-3">
              {p.image_urls[0] && <img src={p.image_urls[0]} alt="" className="size-16 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.title}</p>{p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}</div>
              <RemoveButton label={tr("portfolio")} onClick={async () => { const r = await toastAction(deletePortfolioAction(p.id)); if (r.ok) router.refresh(); }} />
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3" noValidate>
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>{t("projectTitle")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t("description")}</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="project_url" render={({ field }) => (<FormItem><FormLabel>{t("link")}</FormLabel><FormControl><Input type="url" placeholder="https://" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <div><p className="mb-2 text-sm font-medium">{t("images")}</p><PortfolioUpload userId={userId} value={images} onChange={setImages} /></div>
            <div><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} {t("add")}</Button></div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function ProviderProfileManager(props: { userId: string; skills: ProviderSkill[]; certs: ProviderCertification[]; portfolio: ProviderPortfolioItem[] }) {
  return (
    <div className="space-y-6">
      <SkillsSection skills={props.skills} />
      <CertsSection certs={props.certs} userId={props.userId} />
      <PortfolioSection items={props.portfolio} userId={props.userId} />
    </div>
  );
}
