"use client";

import { ErrorView } from "@/app/components/ErrorView";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} homeHref="/admin" homeLabel="Admin home" />;
}
