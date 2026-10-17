import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isUuid } from "@/app/lib/utils";
import { getProviderById } from "@/app/lib/queries";
import { getAuth } from "@/app/lib/guards";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

/** Canonical public profile lives at /provider/[slug]; this resolves ids for links from messages, bookings, etc. */
export default async function PublicProfileRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { profile } = await getAuth();
  if (profile?.id === id) redirect("/profile");
  const user = await getProviderById(id);
  if (!user) notFound();
  if (user.slug) redirect(`/provider/${user.slug}`);
  notFound();
}
