"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  { value: "SEEKER", title: "I want to hire", desc: "Find and book services", icon: Search },
  { value: "PROVIDER", title: "I offer services", desc: "Get discovered and booked", icon: Briefcase },
  { value: "BOTH", title: "Both", desc: "Hire and provide", icon: Layers },
] as const;

export function RegisterForm() {
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
          <AlertTitle>Check your inbox</AlertTitle>
          <AlertDescription>
            We sent a verification link to <strong>{verifyEmail}</strong>. Click it to activate your account, then sign in.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={resend} disabled={resending}>
            {resending && <Loader2 className="animate-spin" />} Resend email
          </Button>
          <Button asChild className="flex-1">
            <Link href="/login">Go to sign in</Link>
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
              <FormLabel>I want to…</FormLabel>
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
                        <RadioGroupItem value={value} aria-label={title} />
                      </span>
                      <span className="font-medium leading-tight">{title}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
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
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Jane Doe" {...field} />
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
                <FormLabel>Email</FormLabel>
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
                <FormLabel>Phone (optional)</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" placeholder="+1 555 000 1234" {...field} value={field.value ?? ""} />
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" {...field} />
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
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="Repeat password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="font-semibold text-primary hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
