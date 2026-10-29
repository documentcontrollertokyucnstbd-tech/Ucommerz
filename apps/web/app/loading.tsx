import { useTranslations } from "next-intl";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function RootLoading() {
  const t = useTranslations("PubErrors");
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-10 sm:px-6" aria-busy="true" aria-label={t("loading")}>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
