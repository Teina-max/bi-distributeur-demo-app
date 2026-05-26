import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { formatDate } from "@/lib/format/date";
import { Calendar, Tag } from "lucide-react";
import type { Changelog } from "./changelog-manager";

type ChangelogDialogProps = {
  changelog: Changelog | null;
  onOpenChange: (open: boolean) => void;
};

export function ChangelogDialog({
  changelog,
  onOpenChange,
}: ChangelogDialogProps) {
  const title = changelog?.attributes.title ?? "Changelog";

  return (
    <Dialog open={Boolean(changelog)} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-hidden p-0 shadow-2xl sm:max-w-2xl lg:max-w-3xl"
        data-changelog-dialog
      >
        {changelog && (
          <div className="flex max-h-[92vh] flex-col">
            {changelog.attributes.image && (
              <div className="relative aspect-[16/7] min-h-40 overflow-hidden">
                <img
                  src={changelog.attributes.image}
                  alt={title}
                  className="absolute inset-0 size-full object-cover"
                />
                <div className="from-background via-background/20 absolute inset-0 bg-linear-to-t to-transparent" />
              </div>
            )}

            <div className="min-h-0 overflow-y-auto">
              <div className="px-5 py-5 sm:px-8 sm:py-7">
                <DialogHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="size-3" />
                      {formatDate(changelog.attributes.date)}
                    </Badge>
                    {changelog.attributes.version && (
                      <Badge variant="outline" className="gap-1">
                        <Tag className="size-3" />v
                        {changelog.attributes.version}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <DialogTitle className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                      {title}
                    </DialogTitle>
                    <DialogDescription>
                      Latest product updates and improvements.
                    </DialogDescription>
                  </div>
                </DialogHeader>

                <div className="prose prose-neutral dark:prose-invert mt-6 max-w-none">
                  <ServerMdx source={changelog.content} />
                </div>
              </div>
            </div>

            <div className="bg-background/95 flex items-center justify-between gap-3 border-t px-5 py-3 sm:px-8">
              <p className="text-muted-foreground truncate text-xs">
                {changelog.slug}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
