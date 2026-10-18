"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Loader2, MailCheck, Search, Layers } from "lucide-react";
import { registerSchema, type RegisterInput } from "@ucommerz/shared";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form";
import { PasswordInput } from "@/app/components/auth/PasswordInput";
import { registerAction, resendVerificationAction } from "@/app/actions/auth";
import { toastAction } from "@/app/lib/toast-action";
import { cn } from "@/app/lib/utils";

const ROLE_OPTIONS = [
  { value: "SEEKER", title: "hire", desc: "hireDesc", icon: Search },
  { value: "PROVIDER", title: "offer", desc: "offerDesc", icon: Briefcase },
  { value: "BOTH", title: "both", desc: "bothDesc", icon: Layers },
] as const;

export function RegisterForm() {
  const t = useTranslations("Register");
  const ta = useTranslations("Auth");
  const router = useRouter();
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", phone: "", role: "SEEKER", password: "", confirm_password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    const res = await toastAction(registerAction(values));
    if (!res.ok) return;
    if (res.data?.needsVerification) {
      setVerifyEmail(values.email);
      return;
    }
    router.replace(res.data?.redirectTo ?? "/dashboard");
    router.refresh();
  }

  async function resend() {
    if (!verifyEmail) return;
    setResending(true);
    await toastAction(resendVerificationAction(verifyEmail));
    setResending(false);
  }

  if (verifyEmail) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <MailCheck />
          <AlertTitle>{t("checkInbox")}</AlertTitle>
          <AlertDescription>
            {t.rich("sentTo", { email: verifyEmail, strong: (chunks) => <strong>{chunks}</strong> })}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={resend} disabled={resending}>
            {resending && <Loader2 className="animate-spin" />} {t("resend")}
          </Button>
          <Button asChild className="flex-1">
            <Link href="/login">{t("goSignIn")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("iWant")}</FormLabel>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                  {ROLE_OPTIONS.map(({ value, title, desc, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors hover:bg-accent",
                        field.value === value && "border-primary bg-primary/5 ring-1 ring-primary",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <Icon className="size-4 text-primary" />
                        <RadioGroupItem value={value} aria-label={t(title)} />
                      </span>
                      <span className="font-medium leading-tight">{t(title)}</span>
                      <span className="text-xs text-muted-foreground">{t(desc)}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("fullName")}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder={t("fullNamePh")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
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
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("phone")}</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder={t("phonePh")} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{ta("password")}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder={t("passwordPh")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirm")}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder={t("confirmPh")} {...field} />
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
          {t("have")}{" "}
          <Link className="font-semibold text-primary hover:underline" href="/login">
            {t("signIn")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
