"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@ucommerz/shared";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { forgotPasswordAction } from "@/app/actions/auth";
import { toastAction } from "@/app/lib/toast-action";

export function ForgotPasswordForm() {
  const t = useTranslations("Forgot");
  const ta = useTranslations("Auth");
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    const res = await toastAction(forgotPasswordAction(values));
    if (res.ok) setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <MailCheck />
          <AlertTitle>{t("sentTitle")}</AlertTitle>
          <AlertDescription>{t("sentBody")}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{t("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{ta("email")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          {t("submit")}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t("remembered")}{" "}
          <Link className="font-semibold text-primary hover:underline" href="/login">
            {t("signIn")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
