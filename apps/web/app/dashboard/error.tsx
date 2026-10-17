"use client";

import { ErrorView } from "@/app/components/ErrorView";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} homeHref="/dashboard" homeLabel="Dashboard home" />;
}
