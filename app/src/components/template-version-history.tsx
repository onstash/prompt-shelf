import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api, type Template } from "@/lib/api";

type Props = {
  template: Template;
  onRestored: (template: Template) => void;
};

export function TemplateVersionHistory({ template, onRestored }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const revisions = useQuery({
    queryKey: ["templates", template.id, "revisions"],
    queryFn: () => api.listTemplateRevisions(template.id),
    enabled: open,
  });
  const selected =
    revisions.data?.find((revision) => revision.version === selectedVersion) ?? revisions.data?.[0];
  const restore = useMutation({
    mutationFn: (version: number) => api.restoreTemplateRevision(template.id, version),
    onSuccess: (restored) => {
      setOpen(false);
      onRestored(restored);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" />}>
        <History data-icon="inline-start" /> Versions
      </SheetTrigger>
      <SheetContent side="right" className="w-full! sm:max-w-lg!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            Review an earlier prompt or restore it as a new version.
          </SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-5 overflow-hidden px-5 pb-5">
          <div className="flex gap-1 overflow-x-auto" aria-label="Template versions">
            {revisions.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">Loading versions…</p>
            ) : (
              revisions.data?.map((revision) => (
                <Button
                  key={revision.version}
                  variant={selected?.version === revision.version ? "secondary" : "ghost"}
                  className="h-auto shrink-0 gap-3 px-3 py-2 text-left"
                  onClick={() => setSelectedVersion(revision.version)}
                >
                  <span>Version {revision.version}</span>
                  {revision.version === template.version ? (
                    <span className="text-xs text-muted-foreground">Current</span>
                  ) : null}
                </Button>
              ))
            )}
          </div>
          {selected ? (
            <section className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-background p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Version {selected.version}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                      new Date(`${selected.createdAt.replace(" ", "T")}Z`),
                    )}
                  </p>
                </div>
                {selected.version !== template.version ? (
                  <Button
                    variant="outline"
                    disabled={restore.isPending}
                    onClick={() => restore.mutate(selected.version)}
                  >
                    {restore.isPending ? "Restoring…" : "Restore as new version"}
                  </Button>
                ) : null}
              </div>
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-7 [overflow-wrap:anywhere]">
                {selected.body}
              </pre>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
