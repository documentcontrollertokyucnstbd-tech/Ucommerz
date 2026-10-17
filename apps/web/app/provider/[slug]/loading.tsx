import { Skeleton } from "@/app/components/ui/skeleton";
import { CardGridSkeleton } from "@/app/components/PageSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <CardGridSkeleton count={4} />
    </div>
  );
}
