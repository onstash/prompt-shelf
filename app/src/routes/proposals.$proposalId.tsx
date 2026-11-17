import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/containers/page-container";
import { BodyDiff, DiffSummary, FieldDiff, MetadataDiff } from "@/components/proposal-diff-view";
import { ShelfLayout } from "@/components/shelf-layout";
import { api } from "@/lib/api";
import { getSessionStatus } from "@/lib/auth.functions";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/proposals/$proposalId")({
  head: () => privatePageHead("Review proposed edit | Prompt Shelf"),
  beforeLoad: async () => {
    const session = await getSessionStatus();
    if (session.status === "signed-out") throw redirect({ to: "/login" });
  },
  component: ProposalRoute,
});

function ProposalRoute() {
  const { proposalId } = useParams({ from: "/proposals/$proposalId" });
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["proposals", proposalId, "diff"],
    queryFn: () => api.getProposalDiff(proposalId),
  });

  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") => api.decideProposal(proposalId, action),
    onSuccess: async (result) => {
      const created = detail.data?.proposal.kind === "create";
      setMessage(
        result.status === "approved"
          ? created
            ? "Template created."
            : `Applied as version ${result.version}.`
          : "Proposal rejected.",
      );
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (error) => {
      setMessage(
        error instanceof Error && error.message.includes("409")
          ? "This template changed since the proposal was made. Review it again before approving."
          : "Could not record your decision. Owner or admin access is required.",
      );
    },
  });

  if (detail.isPending) {
    return (
      <PageContainer>
        <ShelfLayout>
          <main className="sr-only">Loading proposed edit…</main>
        </ShelfLayout>
      </PageContainer>
    );
  }
  if (detail.isError) {
    return (
      <PageContainer>
        <ShelfLayout>
          <main className="mx-auto max-w-2xl px-4 py-10">
            <p role="alert" className="text-sm text-destructive">
              This proposed edit could not be loaded.
            </p>
          </main>
        </ShelfLayout>
      </PageContainer>
    );
  }

  const { proposal, diff } = detail.data;
  const decided = proposal.status !== "pending";
  const pending = decide.isPending;

  return (
    <PageContainer>
      <ShelfLayout>
        <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
          <Link
            to="/proposals"
            search={{ status: "pending" }}
            className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            All proposed edits
          </Link>

          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-balance">{proposal.title}</h1>
            <p className="text-sm text-muted-foreground">
              {proposal.kind === "create"
                ? "New template"
                : `Based on version ${proposal.baseVersion}`}
              {" · "}
              <span className="capitalize">{proposal.status}</span>
            </p>
          </header>

          {diff.breaking ? (
            <Alert variant="destructive">
              This edit removes or changes fields. Saved answers may stop matching the template.
            </Alert>
          ) : null}

          <p role="status" aria-live="polite" className="min-h-5 text-sm">
            {message}
          </p>

          <section aria-labelledby="body-heading" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="body-heading" className="font-medium">
                Prompt text
              </h2>
              <DiffSummary
                body={diff.body}
                addedTokens={diff.addedTokens}
                removedTokens={diff.removedTokens}
              />
            </div>
            <BodyDiff lines={diff.body} />
          </section>

          {diff.metadata.length > 0 ? (
            <section aria-labelledby="meta-heading" className="flex flex-col gap-3">
              <h2 id="meta-heading" className="font-medium">
                Details
              </h2>
              <MetadataDiff changes={diff.metadata} />
            </section>
          ) : null}

          {diff.fields.length > 0 ? (
            <section aria-labelledby="fields-heading" className="flex flex-col gap-3">
              <h2 id="fields-heading" className="font-medium">
                Fields
              </h2>
              <FieldDiff changes={diff.fields} />
            </section>
          ) : null}

          {decided ? null : (
            <div className="flex flex-col gap-3 max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:border-t max-sm:bg-background/95 max-sm:px-4 max-sm:pt-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:backdrop-blur sm:flex-row">
              <Button
                className="h-12 flex-1 active:scale-[0.96] transition-transform"
                aria-busy={pending}
                disabled={pending}
                onClick={() => decide.mutate("approve")}
              >
                {pending
                  ? "Applying…"
                  : proposal.kind === "create"
                    ? "Create template"
                    : "Approve and apply"}
              </Button>
              <Button
                className="h-12 flex-1 active:scale-[0.96] transition-transform"
                variant="outline"
                disabled={pending}
                onClick={() => decide.mutate("reject")}
              >
                Reject
              </Button>
            </div>
          )}
        </main>
      </ShelfLayout>
    </PageContainer>
  );
}
