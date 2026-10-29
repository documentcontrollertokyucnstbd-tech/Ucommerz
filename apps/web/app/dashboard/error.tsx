"use client";

import { useTranslations } from "next-intl";
import { ErrorView } from "@/app/components/ErrorView";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("DashShell");
  return <ErrorView {...props} homeHref="/dashboard" homeLabel={t("errorHome")} />;
}
