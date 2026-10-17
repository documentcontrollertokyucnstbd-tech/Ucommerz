"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { formatDate } from "@/app/lib/utils";

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
  const router = useRouter();
  const form = useForm<SkillInput>({ resolver: zodResolver(skillSchema), defaultValues: { skill_name: "", skill_level: "INTERMEDIATE", years_experience: 1 } });
  async function onSubmit(v: SkillInput) {
    const res = await toastAction(addSkillAction(v));
    if (res.ok) { form.reset(); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Skills</CardTitle><CardDescription>Show customers what you&apos;re great at.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {skills.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span><span className="font-medium">{s.skill_name}</span> <span className="text-muted-foreground">· {s.skill_level.toLowerCase()} · {s.years_experience}y</span></span>
              <RemoveButton label="Remove skill" onClick={async () => { const r = await toastAction(deleteSkillAction(s.id)); if (r.ok) router.refresh(); }} />
            </li>
          ))}
          {skills.length === 0 && <li className="py-2 text-sm text-muted-foreground">No skills added yet.</li>}
        </ul>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-[1fr_150px_100px_auto] sm:items-start" noValidate>
            <FormField control={form.control} name="skill_name" render={({ field }) => (<FormItem><FormLabel className="sr-only">Skill</FormLabel><FormControl><Input placeholder="e.g. React, Plumbing" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="skill_level" render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{SKILL_LEVELS.map((l) => <SelectItem key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="years_experience" render={({ field }) => (<FormItem><FormControl><Input type="number" min={0} aria-label="Years of experience" {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} Add</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------- certifications */
function CertsSection({ certs, userId }: { certs: ProviderCertification[]; userId: string }) {
  const router = useRouter();
  const form = useForm<CertificationInput>({ resolver: zodResolver(certificationSchema), defaultValues: { name: "", issuing_organization: "", issue_date: "", expiry_date: "", certificate_url: "" } });
  async function onSubmit(v: CertificationInput) {
    const res = await toastAction(addCertificationAction(v));
    if (res.ok) { form.reset(); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Certifications</CardTitle><CardDescription>Upload certificates for admin verification.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y">
          {certs.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-2"><Award className="size-4 text-primary" /><span><span className="font-medium">{c.name}</span> <span className="text-muted-foreground">{[c.issuing_organization, c.issue_date && formatDate(c.issue_date)].filter(Boolean).join(" · ")}</span> {c.verified ? <span className="text-xs text-emerald-600">verified</span> : <span className="text-xs text-muted-foreground">pending review</span>}</span></span>
              <RemoveButton label="Remove certification" onClick={async () => { const r = await toastAction(deleteCertificationAction(c.id)); if (r.ok) router.refresh(); }} />
            </li>
          ))}
          {certs.length === 0 && <li className="py-2 text-sm text-muted-foreground">No certifications yet.</li>}
        </ul>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 sm:grid-cols-2" noValidate>
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issuing_organization" render={({ field }) => (<FormItem><FormLabel>Issuer</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="issue_date" render={({ field }) => (<FormItem><FormLabel>Issued</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="expiry_date" render={({ field }) => (<FormItem><FormLabel>Expires</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="certificate_url" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Certificate file</FormLabel><CertificateUpload userId={userId} value={field.value ?? ""} onChange={field.onChange} /><FormMessage /></FormItem>
            )} />
            <div className="sm:col-span-2"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} Add certification</Button></div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- portfolio */
function PortfolioSection({ items, userId }: { items: ProviderPortfolioItem[]; userId: string }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const form = useForm<PortfolioInput>({ resolver: zodResolver(portfolioSchema), defaultValues: { title: "", description: "", project_url: "" } });
  async function onSubmit(v: PortfolioInput) {
    const res = await toastAction(addPortfolioAction({ ...v, image_urls: images }));
    if (res.ok) { form.reset(); setImages([]); router.refresh(); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Portfolio</CardTitle><CardDescription>Showcase your best work.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-lg border p-3">
              {p.image_urls[0] && <img src={p.image_urls[0]} alt="" className="size-16 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.title}</p>{p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}</div>
              <RemoveButton label="Remove portfolio item" onClick={async () => { const r = await toastAction(deletePortfolioAction(p.id)); if (r.ok) router.refresh(); }} />
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No portfolio items yet.</p>}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3" noValidate>
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Project title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="project_url" render={({ field }) => (<FormItem><FormLabel>Project link</FormLabel><FormControl><Input type="url" placeholder="https://" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            <div><p className="mb-2 text-sm font-medium">Images</p><PortfolioUpload userId={userId} value={images} onChange={setImages} /></div>
            <div><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />} Add to portfolio</Button></div>
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
