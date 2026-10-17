import { redirect } from "next/navigation";

export default async function ServicesIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value) qs.set(k, value);
  }
  redirect(`/browse${qs.size ? `?${qs.toString()}` : ""}`);
}
