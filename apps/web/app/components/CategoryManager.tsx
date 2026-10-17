"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CornerDownRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { categorySchema, type Category, type CategoryInput } from "@ucommerz/shared";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { Card } from "@/app/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";
import { toastAction } from "@/app/lib/toast-action";
import { slugify } from "@/app/lib/utils";

const NONE = "__root";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", icon: "", description: "", parent_id: null, order_position: 0, is_active: true },
  });

  const parents = categories.filter((c) => !c.parent_id);

  function open(c: Category | "new", parentId: string | null = null) {
    form.reset(
      c === "new"
        ? { name: "", slug: "", icon: "", description: "", parent_id: parentId, order_position: categories.length, is_active: true }
        : { name: c.name, slug: c.slug, icon: c.icon ?? "", description: c.description ?? "", parent_id: c.parent_id, order_position: c.order_position, is_active: c.is_active },
    );
    setEditing(c);
  }

  async function onSubmit(v: CategoryInput) {
    const res = await toastAction(saveCategoryAction({ ...v, id: editing && editing !== "new" ? editing.id : undefined }));
    if (res.ok) {
      setEditing(null);
      router.refresh();
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Delete “${c.name}”?`)) return;
    const res = await toastAction(deleteCategoryAction(c.id));
    if (res.ok) router.refresh();
  }

  const row = (c: Category, child = false) => (
    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        {child && <CornerDownRight className="size-4 text-muted-foreground" />}
        <span className="truncate font-medium">{c.name}</span>
        <span className="truncate text-xs text-muted-foreground">/{c.slug}</span>
        {!c.is_active && <Badge variant="muted">Hidden</Badge>}
      </div>
      <div className="flex shrink-0 gap-1">
        {!child && <Button type="button" variant="ghost" size="sm" onClick={() => open("new", c.id)}><Plus /> Sub</Button>}
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><Pencil /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} className="text-muted-foreground hover:text-destructive" onClick={() => remove(c)}><Trash2 /></Button>
      </div>
    </li>
  );

  return (
    <>
      <div className="mb-4 flex justify-end"><Button type="button" onClick={() => open("new")}><Plus /> New category</Button></div>
      <Card className="py-0">
        <ul className="divide-y">
          {parents.map((p) => (
            <li key={p.id}>
              <ul>
                {row(p)}
                {categories.filter((c) => c.parent_id === p.id).map((c) => row(c, true))}
              </ul>
            </li>
          ))}
          {parents.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">No categories yet.</li>}
        </ul>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New category" : "Edit category"}</DialogTitle>
            <DialogDescription>Categories organise services. Slugs appear in URLs.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl>
                  <Input {...field} onChange={(e) => { field.onChange(e); if (editing === "new") form.setValue("slug", slugify(e.target.value), { shouldValidate: false }); }} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (<FormItem><FormLabel>Slug</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="parent_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent</FormLabel>
                  <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>None (top level)</SelectItem>
                      {parents.filter((p) => editing === "new" || p.id !== editing?.id).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="icon" render={({ field }) => (<FormItem><FormLabel>Icon key</FormLabel><FormControl><Input placeholder="wrench, code, camera…" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="order_position" render={({ field }) => (<FormItem><FormLabel>Order</FormLabel><FormControl><Input type="number" min={0} {...field} value={Number.isFinite(field.value) ? field.value : ""} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><div><FormLabel>Visible</FormLabel><FormDescription>Hidden categories are not shown to customers.</FormDescription></div></FormItem>
              )} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="animate-spin" />} Save</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
