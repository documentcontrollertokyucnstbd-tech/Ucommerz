"use client";

import { ErrorView } from "@/app/components/ErrorView";

export default function BrowseError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} homeHref="/browse" homeLabel="Browse" />;
}
