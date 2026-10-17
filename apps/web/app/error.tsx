"use client";

import { ErrorView } from "@/app/components/ErrorView";

export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
