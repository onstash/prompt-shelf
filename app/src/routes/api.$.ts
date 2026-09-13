import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createAuth } from "@/server/auth";
import {
  D1TemplateRepository,
  type Template,
  type TemplateInput,
} from "@/server/template-repository";

const productEventSchema = z
  .object({
    name: z.enum(["template_opened", "form_started", "prompt_copied", "template_created"]),
    templateId: z.string().min(1).max(100),
  })
  .strict();

async function getWorkspaceId(request: Request) {
  const session = await createAuth(env, request.url).api.getSession({
    headers: request.headers,
  });
  if (!session) return null;

  const workspaceId = `personal-${session.user.id}`;
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO workspaces (id, name) VALUES (?, ?)").bind(
      workspaceId,
      `${session.user.name}'s shelf`,
    ),
    env.DB.prepare(
      "INSERT OR IGNORE INTO workspace_memberships (workspace_id, user_id, role) VALUES (?, ?, 'owner')",
    ).bind(workspaceId, session.user.id),
  ]);
  return workspaceId;
}

function jsonError(error: string, status: number, details?: { missing: string[] }) {
  return Response.json({ error, ...details }, { status });
}

function compile(template: Template, values: Record<string, string>) {
  const segments: { type: "static" | "value"; text: string; key?: string }[] = [];
  let last = 0;
  const token = /{{\s*([\w-]+)\s*}}/g;
  let match: RegExpExecArray | null;

  while ((match = token.exec(template.body))) {
    if (match.index > last)
      segments.push({ type: "static", text: template.body.slice(last, match.index) });
    segments.push({ type: "value", key: match[1], text: values[match[1]] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < template.body.length)
    segments.push({ type: "static", text: template.body.slice(last) });

  return { text: segments.map((segment) => segment.text).join(""), segments };
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.startsWith("/api/auth/")) return createAuth(env, request.url).handler(request);

  const repository = new D1TemplateRepository(env.DB);
  const exampleMatch = path.match(/^\/api\/examples\/([^/]+)(\/compile)?$/);
  if (exampleMatch) {
    const example = await repository.findSystemExample(decodeURIComponent(exampleMatch[1]));
    if (!example) return jsonError("Example not found", 404);
    if (request.method === "GET" && !exampleMatch[2]) return Response.json(example);
    if (request.method === "POST" && exampleMatch[2]) {
      // SAFETY: compile treats absent and non-string field values as empty values.
      const values = (await request.json()) as Record<string, string>;
      return Response.json(compile(example, values));
    }
    return new Response(null, { status: 405 });
  }

  if (path === "/api/product-events" && request.method === "POST") {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return jsonError("Invalid event", 422);
    }

    const parsed = productEventSchema.safeParse(input);
    if (!parsed.success) return jsonError("Invalid event", 422);
    const { name, templateId } = parsed.data;
    const example = await repository.findSystemExample(templateId);
    let workspaceId: string | null = null;

    if (example) {
      if (name === "template_created") return jsonError("Invalid event", 422);
    } else {
      workspaceId = await getWorkspaceId(request);
      if (!workspaceId) return jsonError("Authentication required", 401);
      if (!(await repository.find(workspaceId, templateId)))
        return jsonError("Template not found", 404);
    }

    await env.DB.prepare(
      "INSERT INTO product_events (id, event_name, template_id, workspace_id) VALUES (?, ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), name, templateId, workspaceId)
      .run();
    return Response.json({ accepted: true }, { status: 202 });
  }

  if (path !== "/api/templates" && !path.startsWith("/api/templates/"))
    return jsonError("Not found", 404);
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) return jsonError("Authentication required", 401);

  if (path === "/api/templates") {
    if (request.method === "GET") return Response.json(await repository.list(workspaceId));
    if (request.method !== "POST") return new Response(null, { status: 405 });

    // SAFETY: required fields are checked below; optional fields retain the existing API contract.
    const input = (await request.json()) as Partial<Template>;
    if (!input.title?.trim() || !input.body?.trim())
      return jsonError("Title and prompt body are required", 422);
    const created: Template = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      category: input.category?.trim() ?? "General",
      body: input.body,
      fields: input.fields ?? [],
      version: 1,
      updatedAt: new Date().toISOString(),
      isExample: false,
    };
    try {
      return Response.json(await repository.create(workspaceId, created), { status: 201 });
    } catch {
      return jsonError("A template with this name already exists", 409);
    }
  }

  const templateMatch = path.match(/^\/api\/templates\/([^/]+)(\/compile|\/revisions)?$/);
  if (!templateMatch) return jsonError("Not found", 404);
  const id = decodeURIComponent(templateMatch[1]);
  const action = templateMatch[2];
  const template = await repository.find(workspaceId, id);
  if (!template) return jsonError("Template not found", 404);

  if (action === "/revisions" && request.method === "GET")
    return Response.json(await repository.listRevisions(workspaceId, id));

  if (action === "/compile" && request.method === "POST") {
    // SAFETY: required values are checked below; compile defaults absent values to empty strings.
    const values = (await request.json()) as Record<string, string>;
    const missing = template.fields
      .filter((field) => field.required && !values[field.key]?.trim())
      .map((field) => field.key);
    if (missing.length) return jsonError("Required fields are missing", 422, { missing });
    return Response.json(compile(template, values));
  }

  if (action) return new Response(null, { status: 405 });
  if (request.method === "GET") return Response.json(template);
  if (request.method === "DELETE") {
    const deleted = await repository.delete(workspaceId, id);
    return deleted ? Response.json({ deleted: true }) : jsonError("Template not found", 404);
  }
  if (request.method === "PUT") {
    // SAFETY: required fields are checked below; optional fields retain the existing API contract.
    const input = (await request.json()) as Partial<Template>;
    if (!input.title?.trim() || !input.body?.trim())
      return jsonError("Title and prompt body are required", 422);
    const update: TemplateInput = {
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      category: input.category?.trim() ?? template.category,
      body: input.body,
      fields: input.fields ?? [],
    };
    const updated = await repository.update(workspaceId, id, update);
    return updated ? Response.json(updated) : jsonError("System examples cannot be edited", 403);
  }

  return new Response(null, { status: 405 });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      PUT: ({ request }) => handle(request),
      PATCH: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
      OPTIONS: ({ request }) => handle(request),
    },
  },
});
