import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createAuth } from "@/server/auth";
import { getDb } from "@/server/database";
import { handleMcpRequest } from "@/server/mcp-server";
import { personalWorkspaceId } from "@/server/workspace";

// The claims that Better Auth's verifier guarantees for MCP tokens.
const claimsSchema = z.object({
  sub: z.string().min(1),
  scope: z.string().optional(),
  azp: z.string().optional(),
});

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

async function handle(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  const resource = new URL("/mcp", request.url).toString();
  const verified = requireMcpAuth(
    createAuth(request.url),
    async (req, claims) => {
      const parsed = claimsSchema.safeParse(claims);
      if (!parsed.success) return jsonError("Invalid token claims", 401);

      const db = getDb();
      const workspaceId = personalWorkspaceId(parsed.data.sub);
      const membership = await db
        .query("SELECT 1 FROM workspace_memberships WHERE workspace_id = ? AND user_id = ?")
        .bind(workspaceId, parsed.data.sub)
        .first();
      if (!membership) return jsonError("Workspace access denied", 403);

      const scopes = new Set((parsed.data.scope ?? "").split(" ").filter(Boolean));
      return handleMcpRequest(req, {
        db,
        workspaceId,
        clientId: parsed.data.azp ?? null,
        scopes,
      });
    },
    { resource },
  );
  return verified(request);
}

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
