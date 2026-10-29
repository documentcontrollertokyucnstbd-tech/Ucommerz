"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { TEMPLATE_CATEGORIES, TEMPLATE_VARIABLES, messageTemplateSchema, type MessageTemplate, type MessageTemplateInput } from "@ucommerz/shared";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { Card, CardContent } from "@/app/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { EmptyState } from "@/app/components/EmptyState";
import { deleteTemplateAction, saveTemplateAction } from "@/app/actions/templates";
import { toastAction } from "@/app/lib/toast-action";

const EMPTY: MessageTemplateInput = { name: "", subject: "", content: "", category: "GENERAL", is_active: true };

export function TemplateManager({ templates }: { templates: MessageTemplate[] }) {
  const t = useTranslations("DashTemplates");
  const router = useRouter();
  const [editing, setEditing] = useState<MessageTemplate | "new" | null>(null);
  const [toDelete, setToDelete] = useState<MessageTemplate | null>(null);
  const form = useForm<MessageTemplateInput>({ resolver: zodResolver(messageTemplateSchema), defaultValues: EMPTY });

  function openEditor(tpl: MessageTemplate | "new") {
    form.reset(tpl === "new" ? EMPTY : { name: tpl.name, subject: tpl.subject ?? "", content: tpl.content, category: tpl.category, is_active: tpl.is_active });
    setEditing(tpl);
  }

  async function onSubmit(values: MessageTemplateInput) {
    const res = await toastAction(saveTemplateAction(editing && editing !== "new" ? editing.id : null, values));
    if (res.ok) {
      setEditing(null);
      router.refresh();
    }
  }

  function insertVar(key: string) {
    const cur = form.getValues("content");
    form.setValue("content", `${cur}${cur && !cur.endsWith(" ") ? " " : ""}{{${key}}}`, { shouldValidate: true });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={() => openEditor("new")}><Plus /> {t("newTemplate")}</Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState icon={<FileText className="size-5" />} title={t("emptyTitle")} description={t("emptyDesc")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{t("categoryUsed", { category: t(`categories.${tpl.category}`), count: tpl.usage_count })}</p>
                  </div>
                  <Badge variant={tpl.is_active ? "success" : "muted"}>{tpl.is_active ? t("active") : t("inactive")}</Badge>
                </div>
                <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{tpl.content}</p>
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditor(tpl)}><Pencil /> {t("edit")}</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setToDelete(tpl)}><Trash2 /> {t("delete")}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? t("newTemplate") : t("editTemplate")}</DialogTitle>
            <DialogDescription>{t("dialogDesc")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t("name")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("category")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("message")}</FormLabel>
                  <FormControl><Textarea rows={6} {...field} /></FormControl>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button key={v.key} type="button" title={t(`variables.${v.key}`)} onClick={() => insertVar(v.key)} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">{`{{${v.key}}}`}</button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">{t("activeLabel")}</FormLabel></FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} {t("save")}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("deleteTitle", { name: toDelete?.name ?? "" })}</AlertDialogTitle><AlertDialogDescription>{t("deleteDesc")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={async () => { if (!toDelete) return; const res = await toastAction(deleteTemplateAction(toDelete.id)); if (res.ok) { setToDelete(null); router.refresh(); } }}>{t("delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
