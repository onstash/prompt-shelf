import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
};

export function TemplateVersionHistory({ template }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const revisions = useQuery({
    queryKey: ["templates", template.id, "revisions"],
    queryFn: () => api.listTemplateRevisions(template.id),
    enabled: open,
  });
  const selected =
    revisions.data?.find((revision) => revision.version === selectedVersion) ?? revisions.data?.[0];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <History data-icon="inline-start" /> Versions
      </SheetTrigger>
      <SheetContent side="right" className="w-full! sm:max-w-lg!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>Review the prompt and fields from previous versions.</SheetDescription>
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
              <div className="mb-4">
                <h3 className="font-medium">Version {selected.version}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                    new Date(`${selected.createdAt.replace(" ", "T")}Z`),
                  )}
                </p>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b pb-4">
                <span className="mr-1 text-xs font-medium text-muted-foreground">
                  {selected.fields.length} {selected.fields.length === 1 ? "field" : "fields"}
                </span>
                {selected.fields.map((field) => (
                  <code key={field.key} className="rounded bg-muted px-2 py-1 text-xs">
                    {`{{${field.key}}}`}
                  </code>
                ))}
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
