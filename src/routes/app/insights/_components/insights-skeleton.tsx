import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";

function StatTile() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-32" />
      </CardContent>
    </Card>
  );
}

function PanelSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full rounded" />
        ))}
      </CardContent>
    </Card>
  );
}

export function InsightsDashboardSkeleton() {
  return (
    <Layout size="xl">
      <LayoutHeader>
        <LayoutTitle>
          <Skeleton className="h-7 w-44" />
        </LayoutTitle>
      </LayoutHeader>
      <LayoutContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatTile key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PanelSkeleton rows={6} />
            <PanelSkeleton rows={6} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PanelSkeleton rows={10} />
            <PanelSkeleton rows={10} />
          </div>
          <PanelSkeleton rows={16} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PanelSkeleton rows={10} />
            <PanelSkeleton rows={10} />
          </div>
        </div>
      </LayoutContent>
    </Layout>
  );
}
