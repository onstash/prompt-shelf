import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/containers/page-container";
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

const LINE_MARK = { same: " ", added: "+", removed: "-" } as const;

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
      setMessage(
        result.status === "approved"
          ? `Applied as version ${result.version}.`
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
        <main className="sr-only">Loading proposed edit…</main>
      </PageContainer>
    );
  }
  if (detail.isError) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <p role="alert" className="text-sm text-destructive">
            This proposed edit could not be loaded.
          </p>
        </main>
      </PageContainer>
    );
  }

  const { proposal, diff } = detail.data;
  const decided = proposal.status !== "pending";

  return (
    <PageContainer>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <Link to="/proposals" className="text-sm underline-offset-4 hover:underline">
          All proposed edits
        </Link>
        <header>
          <h1 className="text-2xl font-semibold">{proposal.title}</h1>
          <p className="text-muted-foreground">
            Based on version {proposal.baseVersion} · status {proposal.status}
          </p>
        </header>

        {diff.breaking ? (
          <Alert variant="destructive">
            This edit removes or changes fields. Saved answers may stop matching the template.
          </Alert>
        ) : null}
        {message ? <p className="text-sm">{message}</p> : null}

        {diff.metadata.length > 0 ? (
          <section aria-labelledby="meta-heading" className="flex flex-col gap-2">
            <h2 id="meta-heading" className="font-medium">
              Details
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {diff.metadata.map((change) => (
                <li key={change.name}>
                  {change.name}: <span className="line-through">{change.from}</span> → {change.to}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {diff.fields.length > 0 ? (
          <section aria-labelledby="fields-heading" className="flex flex-col gap-2">
            <h2 id="fields-heading" className="font-medium">
              Fields
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {diff.fields.map((change) => (
                <li key={`${change.kind}-${change.key}`}>
                  <span className={change.breaking ? "text-destructive" : undefined}>
                    {change.kind} “{change.key}”
                  </span>
                  {change.details.length ? `: ${change.details.join(", ")}` : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="body-heading" className="flex flex-col gap-2">
          <h2 id="body-heading" className="font-medium">
            Prompt text
          </h2>
          <pre className="overflow-x-auto rounded-md border p-4 text-sm whitespace-pre-wrap">
            {diff.body.map((line, index) => (
              <span
                key={`${index}-${line.kind}`}
                className={line.kind === "same" ? "block" : "block font-medium"}
              >
                {LINE_MARK[line.kind]} {line.text}
                {"\n"}
              </span>
            ))}
          </pre>
          <p className="text-sm text-muted-foreground">
            Added tokens: {diff.addedTokens.join(", ") || "none"} · Removed tokens:{" "}
            {diff.removedTokens.join(", ") || "none"}
          </p>
        </section>

        {decided ? null : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="h-12"
              disabled={decide.isPending}
              onClick={() => decide.mutate("approve")}
            >
              Approve and apply
            </Button>
            <Button
              className="h-12"
              variant="outline"
              disabled={decide.isPending}
              onClick={() => decide.mutate("reject")}
            >
              Reject
            </Button>
          </div>
        )}
      </main>
    </PageContainer>
  );
}
