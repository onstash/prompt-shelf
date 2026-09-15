import { z } from "zod";
import { D1RunRepository } from "./run-repository.ts";

const cursorSchema = z
  .string()
  .max(200)
  .regex(/^[^|]+\|[^|]+$/);

const createRunSchema = z
  .object({
    templateVersion: z.number().int().positive(),
    values: z.record(z.string(), z.string()),
  })
  .strict();

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function handleRunRequest(
  request: Request,
  workspaceId: string | null,
  db: D1Database,
): Promise<Response> {
  if (!workspaceId) return jsonError("Authentication required", 401);

  const url = new URL(request.url);
  const path = url.pathname;
  const runs = new D1RunRepository(db);
  const createMatch = path.match(/^\/api\/templates\/([^/]+)\/runs$/);
  if (createMatch && request.method === "POST") {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return jsonError("Invalid run", 422);
    }
    const parsed = createRunSchema.safeParse(input);
    if (!parsed.success) return jsonError("Invalid run", 422);
    const run = await runs.create(
      workspaceId,
      decodeURIComponent(createMatch[1]),
      parsed.data.templateVersion,
      parsed.data.values,
    );
    return run
      ? Response.json(run, { status: 201 })
      : jsonError("Template revision not found", 404);
  }

  if (path === "/api/runs" && request.method === "GET") {
    const cursor = url.searchParams.get("cursor");
    if (cursor && !cursorSchema.safeParse(cursor).success) return jsonError("Invalid cursor", 422);
    return Response.json(await runs.list(workspaceId, cursor ?? undefined));
  }

  const runMatch = path.match(/^\/api\/runs\/([^/]+)$/);
  if (runMatch) {
    const runId = decodeURIComponent(runMatch[1]);
    if (request.method === "GET") {
      const run = await runs.find(workspaceId, runId);
      return run ? Response.json(run) : jsonError("Run not found", 404);
    }
    if (request.method === "DELETE") {
      const deleted = await runs.delete(workspaceId, runId);
      return deleted ? Response.json({ deleted: true }) : jsonError("Run not found", 404);
    }
  }

  return new Response(null, { status: 405 });
}
