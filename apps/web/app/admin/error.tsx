"use client";

import { useTranslations } from "next-intl";
import { ErrorView } from "@/app/components/ErrorView";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("AdmNav");
  return <ErrorView {...props} homeHref="/admin" homeLabel={t("adminHome")} />;
}
