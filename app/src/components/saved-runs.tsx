import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { compilePrompt } from "@/lib/compile-prompt";
import { copyAndSaveRun } from "@/lib/copy-and-save-run";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(`${value.replace(" ", "T")}Z`),
  );
}

export function SavedRuns() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const runs = useInfiniteQuery({
    queryKey: ["runs"],
    queryFn: ({ pageParam }) => api.listRuns(pageParam || undefined),
    initialPageParam: "",
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: open,
  });
  const runItems = runs.data?.pages.flatMap((page) => page.runs);
  const selected = useQuery({
    queryKey: ["runs", selectedId],
    queryFn: () => api.getRun(selectedId ?? ""),
    enabled: open && Boolean(selectedId),
  });
  const remove = useMutation({
    mutationFn: api.deleteRun,
    onSuccess: async () => {
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Run deleted");
    },
    onError: () => toast.error("Could not delete this run"),
  });

  const compiled = selected.data
    ? compilePrompt(selected.data.body, selected.data.values).text
    : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" className="mx-1 justify-start" />}>
        <Clock3 data-icon="inline-start" /> Saved runs
      </SheetTrigger>
      <SheetContent side="right" className="w-full! sm:max-w-xl!">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Saved runs</SheetTitle>
          <SheetDescription>Revisit prompts copied from your shelf.</SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden px-5 pb-5 sm:grid-cols-[12rem_1fr]">
          <div className="flex max-h-40 flex-col gap-1 overflow-y-auto sm:max-h-none">
            {runs.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">Loading runs…</p>
            ) : null}
            {runs.isError ? (
              <div className="space-y-2 p-3 text-sm">
                <p className="text-destructive">Could not load saved runs.</p>
                <Button variant="outline" size="sm" onClick={() => void runs.refetch()}>
                  Try again
                </Button>
              </div>
            ) : null}
            {runItems?.length === 0 ? (
              <p className="p-3 text-sm leading-6 text-muted-foreground">
                Copied prompts will appear here.
              </p>
            ) : null}
            {runItems?.map((run) => (
              <Button
                key={run.id}
                variant={run.id === selectedId ? "secondary" : "ghost"}
                className="h-auto w-full justify-start px-3 py-2.5 text-left whitespace-normal"
                onClick={() => setSelectedId(run.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate">{run.templateTitle}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    Version {run.templateVersion}
                  </span>
                </span>
              </Button>
            ))}
            {runs.hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                disabled={runs.isFetchingNextPage}
                onClick={() => void runs.fetchNextPage()}
              >
                {runs.isFetchingNextPage ? "Loading…" : "Load older runs"}
              </Button>
            ) : null}
          </div>

          <div className="min-h-0 overflow-y-auto rounded-xl border border-border p-5">
            {!selectedId ? (
              <p className="text-sm text-muted-foreground">Select a run to inspect it.</p>
            ) : selected.isPending ? (
              <p className="text-sm text-muted-foreground">Loading run…</p>
            ) : selected.isError || !selected.data ? (
              <p className="text-sm text-destructive">Could not load this run.</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selected.data.createdAt)}
                  </p>
                  <h3 className="mt-1 font-medium">{selected.data.templateTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    Template version {selected.data.templateVersion}
                  </p>
                </div>

                {selected.data.fields.length > 0 ? (
                  <dl className="space-y-3">
                    {selected.data.fields.map((field) => (
                      <div key={field.key}>
                        <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm break-words">
                          {selected.data?.values[field.key] || "Not provided"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">This run has no field values.</p>
                )}

                <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-mono text-sm leading-6">
                  {compiled}
                </pre>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      const copyResult = await copyAndSaveRun(compiled ?? "", async () => {
                        await api.createRun(
                          selected.data.templateId,
                          selected.data.templateVersion,
                          selected.data.values,
                        );
                      });
                      if (copyResult === "copy-failed")
                        return toast.error("Could not copy this prompt");

                      void api
                        .trackProductEvent("prompt_copied", selected.data.templateId)
                        .catch(() => undefined);
                      if (copyResult === "saved") {
                        await queryClient.invalidateQueries({ queryKey: ["runs"] });
                        toast.success("Prompt copied and saved");
                      } else {
                        toast.error("Prompt copied, but could not be saved");
                      }
                    }}
                  >
                    <Copy data-icon="inline-start" /> Copy again
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" />}>
                      <Trash2 data-icon="inline-start" /> Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this saved run?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the saved values and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => remove.mutate(selected.data.id)}
                        >
                          Delete run
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
