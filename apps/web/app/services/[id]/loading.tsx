import { Skeleton } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Loading">
      <div className="space-y-4"><Skeleton className="aspect-[16/9] w-full rounded-2xl" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /></div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
