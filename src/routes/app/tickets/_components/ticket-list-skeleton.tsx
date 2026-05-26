import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout, LayoutContent, LayoutHeader } from "@/features/page/layout";

export function TicketListSkeleton() {
  return (
    <Layout size="xl">
      <LayoutHeader>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <Card>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full rounded" />
              ))}
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}

export function TicketDetailSkeleton() {
  return (
    <Layout size="xl">
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full rounded" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, row) => (
                <Skeleton key={row} className="h-12 w-full rounded" />
              ))}
            </CardContent>
          </Card>
        </div>
      </LayoutContent>
    </Layout>
  );
}

export function TicketFormSkeleton() {
  return (
    <Layout size="xl">
      <LayoutContent>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
