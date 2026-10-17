import { CardGridSkeleton, PageHeaderSkeleton } from "@/app/components/PageSkeleton";

export default function Loading() {
  return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6"><PageHeaderSkeleton /><CardGridSkeleton /></div>;
}
