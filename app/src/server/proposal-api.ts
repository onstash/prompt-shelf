import { createAuth } from "./auth.ts";
import type { Db } from "./db.ts";
import { diffProposal } from "./proposal-diff.ts";
import { canDecideProposals } from "./proposal-permissions.ts";
import {
  D1ProposalRepository,
  type ProposalDecisionResult,
  type ProposalStatus,
} from "./proposal-repository.ts";
import type { TemplateInput } from "./template-repository.ts";
import { D1TemplateRepository } from "./template-repository.ts";
import { personalWorkspaceId } from "./workspace.ts";

const LIST_STATUSES = ["pending", "approved", "rejected", "conflict", "all"] as const;

const EMPTY_TEMPLATE: TemplateInput = {
  title: "",
  description: "",
  category: "",
  body: "",
  fields: [],
};

async function templateFor(
  db: Db,
  workspaceId: string,
  templateId: string,
): Promise<TemplateInput | null> {
  return new D1TemplateRepository(db).find(workspaceId, templateId);
}

function json(body: object, status = 200): Response {
  return Response.json(body, { status });
}

function decisionResponse(result: ProposalDecisionResult): Response {
  switch (result.status) {
    case "approved":
      return json({ status: "approved", version: result.version, templateId: result.templateId });
    case "rejected":
      return json({ status: "rejected" });
    case "conflict":
      return json(
        {
          error: "Template changed since this proposal was made",
          currentVersion: result.currentVersion,
        },
        409,
      );
    case "not_pending":
      return json({ error: "This proposal has already been decided" }, 409);
    case "not_found":
      return json({ error: "Proposal not found" }, 404);
  }
}

/**
 * Browser-only proposal API. It needs a signed-in session cookie, so an MCP bearer token cannot
 * approve anything (ADR-0010).
 */
export async function handleProposalRequest(request: Request, db: Db): Promise<Response> {
  const session = await createAuth(request.url).api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Authentication required" }, 401);

  const workspaceId = personalWorkspaceId(session.user.id);
  const membership = await db
    .query("SELECT role FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?")
    .bind(workspaceId, session.user.id)
    .first<{ role: string }>();
  if (!membership) return json({ error: "Workspace access denied" }, 403);

  const proposals = new D1ProposalRepository(db);
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);
  // segments: ["api", "proposals"] | ["api", "proposals", id] | ["api", "proposals", id, action]

  if (segments.length === 2 && request.method === "GET") {
    const status = new URL(request.url).searchParams.get("status") ?? "pending";
    if (!LIST_STATUSES.some((value) => value === status))
      return json({ error: "Invalid status" }, 422);
    // SAFETY: the value was checked against LIST_STATUSES above, so it is a valid ProposalStatus unless "all".
    const filter = status === "all" ? null : (status as ProposalStatus);
    return json({ proposals: await proposals.list(workspaceId, filter) });
  }

  const id = segments[2];
  if (!id) return json({ error: "Not found" }, 404);

  if (segments.length === 3 && request.method === "GET") {
    const proposal = await proposals.find(workspaceId, id);
    return proposal ? json(proposal) : json({ error: "Proposal not found" }, 404);
  }

  if (segments.length === 4 && segments[3] === "diff" && request.method === "GET") {
    const proposal = await proposals.find(workspaceId, id);
    if (!proposal) return json({ error: "Proposal not found" }, 404);
    // A creation is compared with an empty template, so every line shows as added.
    if (!proposal.templateId) {
      return json({ proposal, diff: diffProposal(EMPTY_TEMPLATE, proposal) });
    }
    const current = await templateFor(db, workspaceId, proposal.templateId);
    if (!current) return json({ error: "Template not found" }, 404);
    return json({ proposal, diff: diffProposal(current, proposal) });
  }

  const action = segments[3];
  if (
    segments.length === 4 &&
    request.method === "POST" &&
    (action === "approve" || action === "reject")
  ) {
    if (!canDecideProposals(membership.role))
      return json({ error: "Owner or admin access required" }, 403);
    const result =
      action === "approve"
        ? await proposals.approve(workspaceId, id, session.user.id)
        : await proposals.reject(workspaceId, id, session.user.id);
    return decisionResponse(result);
  }

  return new Response(null, { status: 405 });
}
