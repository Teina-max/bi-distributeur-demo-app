import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout, LayoutContent, LayoutHeader } from "@/features/page/layout";

export function InvoiceAggregateSkeleton() {
  return (
    <Layout size="xl">
      <LayoutHeader>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </LayoutHeader>
      <LayoutContent>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full rounded-md" />
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded" />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-44 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
