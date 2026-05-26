import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl border py-6 shadow-sm">
      <div className="px-6">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex flex-col gap-2 px-6">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
