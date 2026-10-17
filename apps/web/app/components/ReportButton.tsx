"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
import { reportSchema, type ReportInput, type ReportReason, type ReportTargetType } from "@ucommerz/shared";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useSupabase } from "@/app/hooks/useSupabase";
import { submitReportAction } from "@/app/actions/reports";
import { toastAction } from "@/app/lib/toast-action";

export function ReportButton({
  targetType,
  targetId,
  label = "Report",
  size = "sm",
  variant = "ghost",
  signedIn = true,
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
  size?: "default" | "sm" | "icon" | "icon-sm";
  variant?: "ghost" | "outline";
  signedIn?: boolean;
}) {
  const router = useRouter();
  const supabase = useSupabase();
  const [open, setOpen] = useState(false);

  const { data: reasons = [] } = useQuery({
    queryKey: ["report-reasons", targetType],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("report_reasons").select("*").eq("target_type", targetType).eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as ReportReason[];
    },
  });

  const form = useForm<ReportInput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { target_type: targetType, target_id: targetId, reason: "", description: "" },
  });

  async function onSubmit(values: ReportInput) {
    const res = await toastAction(submitReportAction(values));
    if (res.ok) {
      setOpen(false);
      form.reset({ target_type: targetType, target_id: targetId, reason: "", description: "" });
    }
  }

  function onOpenChange(next: boolean) {
    if (next && !signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size} aria-label={label}>
          <Flag />
          {size !== "icon" && size !== "icon-sm" && label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {targetType.toLowerCase()}</DialogTitle>
          <DialogDescription>Tell us what&apos;s wrong. Reports are reviewed by our moderation team.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasons.map((r) => (
                        <SelectItem key={r.id} value={r.reason}>
                          {r.reason}
                        </SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Add anything that helps us investigate…" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                Submit report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
