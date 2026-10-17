"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_LABELS, TEMPLATE_VARIABLES, messageTemplateSchema, type MessageTemplate, type MessageTemplateInput } from "@ucommerz/shared";
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
  const router = useRouter();
  const [editing, setEditing] = useState<MessageTemplate | "new" | null>(null);
  const [toDelete, setToDelete] = useState<MessageTemplate | null>(null);
  const form = useForm<MessageTemplateInput>({ resolver: zodResolver(messageTemplateSchema), defaultValues: EMPTY });

  function openEditor(t: MessageTemplate | "new") {
    form.reset(t === "new" ? EMPTY : { name: t.name, subject: t.subject ?? "", content: t.content, category: t.category, is_active: t.is_active });
    setEditing(t);
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
        <Button type="button" onClick={() => openEditor("new")}><Plus /> New template</Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState icon={<FileText className="size-5" />} title="No templates yet" description="Save replies you send often and insert them in one click from Messages." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{TEMPLATE_CATEGORY_LABELS[t.category]} · used {t.usage_count}×</p>
                  </div>
                  <Badge variant={t.is_active ? "success" : "muted"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">{t.content}</p>
                <div className="flex justify-end gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditor(t)}><Pencil /> Edit</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setToDelete(t)}><Trash2 /> Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New template" : "Edit template"}</DialogTitle>
            <DialogDescription>Use variables to personalise each message automatically.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl><Textarea rows={6} {...field} /></FormControl>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button key={v.key} type="button" title={v.description} onClick={() => insertVar(v.key)} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary hover:text-primary">{`{{${v.key}}}`}</button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Active (available in Messages)</FormLabel></FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete “{toDelete?.name}”?</AlertDialogTitle><AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={async () => { if (!toDelete) return; const res = await toastAction(deleteTemplateAction(toDelete.id)); if (res.ok) { setToDelete(null); router.refresh(); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
