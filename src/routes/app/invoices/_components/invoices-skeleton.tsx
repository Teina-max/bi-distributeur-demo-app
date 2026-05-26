import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout, LayoutContent, LayoutHeader } from "@/features/page/layout";

export function InvoicesListSkeleton() {
  return (
    <Layout size="xl">
      <LayoutHeader>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </LayoutHeader>
      <LayoutContent>
        <Card>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}

export function InvoiceDetailSkeleton() {
  return (
    <Layout size="xl">
      <LayoutContent>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full rounded" />
            ))}
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
