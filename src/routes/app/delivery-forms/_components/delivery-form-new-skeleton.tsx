import { Skeleton } from "@/components/ui/skeleton";

export function DeliveryFormNewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
