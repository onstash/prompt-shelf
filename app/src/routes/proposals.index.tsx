import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ShelfLayout } from "@/components/shelf-layout";
import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/containers/page-container";
import { api, type ProposalListStatus, type ProposalSummary } from "@/lib/api";
import { getSessionStatus } from "@/lib/auth.functions";
import { privatePageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

const STATUS_TABS: Array<{ value: ProposalListStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "conflict", label: "Conflict" },
  { value: "all", label: "All" },
];

const searchSchema = z.object({
  status: z
    .enum(["pending", "approved", "rejected", "conflict", "all"])
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/proposals/")({
  head: () => privatePageHead("Proposed edits | Prompt Shelf"),
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const session = await getSessionStatus();
    if (session.status === "signed-out") throw redirect({ to: "/login" });
  },
  component: ProposalsRoute,
});

function describe(proposal: ProposalSummary): string {
  const origin =
    proposal.kind === "create" ? "New template" : `Based on version ${proposal.baseVersion}`;
  const outcome =
    proposal.status === "approved"
      ? proposal.kind === "create"
        ? "Template created"
        : `Applied as version ${proposal.appliedVersion}`
      : proposal.status === "conflict"
        ? "Template changed since this was proposed"
        : proposal.status === "rejected"
          ? "Rejected"
          : "Waiting for review";
  return `${origin} · ${outcome} · ${new Date(proposal.createdAt).toLocaleString()}`;
}

function ProposalsRoute() {
  const status = Route.useSearch().status ?? "pending";
  const proposals = useQuery({
    queryKey: ["proposals", status],
    queryFn: () => api.listProposals(status),
  });

  return (
    <PageContainer>
      <ShelfLayout>
        <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
          <h1 className="text-2xl font-semibold">Proposed edits</h1>
          <p className="text-muted-foreground">
            AI apps can suggest changes to your prompts. Nothing changes until you approve it.
          </p>
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => {
              const active = tab.value === status;
              return (
                <Link
                  key={tab.value}
                  to="/proposals"
                  search={{ status: tab.value }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }),
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {proposals.isPending ? <p className="text-muted-foreground">Loading…</p> : null}
          {proposals.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not load proposed edits.
            </p>
          ) : null}
          {proposals.data?.proposals.length === 0 ? (
            <p className="text-muted-foreground">Nothing here yet.</p>
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
                <p className="text-sm text-muted-foreground">{describe(proposal)}</p>
              </li>
            ))}
          </ul>
        </main>
      </ShelfLayout>
    </PageContainer>
  );
}
