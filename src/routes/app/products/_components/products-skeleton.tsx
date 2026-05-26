import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout, LayoutContent, LayoutHeader } from "@/features/page/layout";

export function ProductsListSkeleton() {
  return (
    <Layout size="xl">
      <LayoutHeader>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-80 rounded-md" />
          <Card>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded" />
              ))}
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}

export function ProductDetailSkeleton() {
  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full rounded" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full rounded" />
              ))}
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}
