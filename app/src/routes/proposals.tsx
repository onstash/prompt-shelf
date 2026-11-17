import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PageContainer } from "@/containers/page-container";
import { api } from "@/lib/api";
import { getSessionStatus } from "@/lib/auth.functions";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/proposals")({
  head: () => privatePageHead("Proposed edits | Prompt Shelf"),
  beforeLoad: async () => {
    const session = await getSessionStatus();
    if (session.status === "signed-out") throw redirect({ to: "/login" });
  },
  component: ProposalsRoute,
});

function ProposalsRoute() {
  const proposals = useQuery({ queryKey: ["proposals"], queryFn: api.listProposals });

  return (
    <PageContainer>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        <h1 className="text-2xl font-semibold">Proposed edits</h1>
        <p className="text-muted-foreground">
          AI apps can suggest changes to your prompts. Nothing changes until you approve it.
        </p>
        {proposals.isPending ? <p className="text-muted-foreground">Loading…</p> : null}
        {proposals.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load proposed edits.
          </p>
        ) : null}
        {proposals.data?.proposals.length === 0 ? (
          <p className="text-muted-foreground">No proposed edits are waiting for review.</p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {proposals.data?.proposals.map((proposal) => (
            <li key={proposal.id} className="rounded-md border p-4">
              <Link
                to="/proposals/$proposalId"
                params={{ proposalId: proposal.id }}
                className="font-medium underline-offset-4 hover:underline"
              >
                {proposal.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                Based on version {proposal.baseVersion} ·{" "}
                {new Date(proposal.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </PageContainer>
  );
}
