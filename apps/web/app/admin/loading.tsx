import { ListSkeleton, PageHeaderSkeleton } from "@/app/components/PageSkeleton";

export default function Loading() {
  return <div><PageHeaderSkeleton /><ListSkeleton /></div>;
}
