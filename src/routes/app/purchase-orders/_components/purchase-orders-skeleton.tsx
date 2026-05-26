import { Skeleton } from "@/components/ui/skeleton";

export function PurchaseOrdersListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  );
}

export function PurchaseOrderFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

export function PurchaseOrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
