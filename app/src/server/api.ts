import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { createAuth, type AppBindings } from "./auth";
import { D1TemplateRepository, type Template, type TemplateInput } from "./template-repository";

type Variables = { workspaceId: string };
const productEventSchema = z
  .object({
    name: z.enum(["template_opened", "form_started", "prompt_copied", "template_created"]),
    templateId: z.string().min(1).max(100),
  })
  .strict();
const app = new Hono<{ Bindings: AppBindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const origins = ["http://localhost:5173", c.env.FRONTEND_URL].filter((origin): origin is string =>
    Boolean(origin),
  );
  return cors({ origin: origins, credentials: true })(c, next);
});
app.all("/api/auth/*", (c) => createAuth(c.env, c.req.url).handler(c.req.raw));
app.use("/api/templates/*", async (c, next) => {
  const session = await createAuth(c.env, c.req.url).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) return c.json({ error: "Authentication required" }, 401);
  const workspaceId = `personal-${session.user.id}`;
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT OR IGNORE INTO workspaces (id, name) VALUES (?, ?)").bind(
      workspaceId,
      `${session.user.name}'s shelf`,
    ),
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO workspace_memberships (workspace_id, user_id, role) VALUES (?, ?, 'owner')",
    ).bind(workspaceId, session.user.id),
  ]);
  c.set("workspaceId", workspaceId);
  await next();
});
app.get("/health", (c) => c.json({ ok: true, service: "prompt-shelf-api" }));

app.get("/api/examples/:id", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const example = await repository.findSystemExample(c.req.param("id"));
  return example ? c.json(example) : c.json({ error: "Example not found" }, 404);
});

app.post("/api/examples/:id/compile", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const example = await repository.findSystemExample(c.req.param("id"));
  if (!example) return c.json({ error: "Example not found" }, 404);
  const values = await c.req.json<Record<string, string>>();
  return c.json(compile(example, values));
});

app.post("/api/product-events", async (c) => {
  let input: unknown;
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "Invalid event" }, 422);
  }

  const parsed = productEventSchema.safeParse(input);
  if (!parsed.success) return c.json({ error: "Invalid event" }, 422);
  const { name, templateId } = parsed.data;

  const repository = new D1TemplateRepository(c.env.DB);
  const example = await repository.findSystemExample(templateId);
  let workspaceId: string | null = null;

  if (example) {
    if (name === "template_created") return c.json({ error: "Invalid event" }, 422);
  } else {
    const session = await createAuth(c.env, c.req.url).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session) return c.json({ error: "Authentication required" }, 401);
    workspaceId = `personal-${session.user.id}`;
    const template = await repository.find(workspaceId, templateId);
    if (!template) return c.json({ error: "Template not found" }, 404);
  }

  await c.env.DB.prepare(
    "INSERT INTO product_events (id, event_name, template_id, workspace_id) VALUES (?, ?, ?, ?)",
  )
    .bind(crypto.randomUUID(), name, templateId, workspaceId)
    .run();
  return c.json({ accepted: true }, 202);
});

app.get("/api/templates", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  return c.json(await repository.list(c.get("workspaceId")));
});

app.get("/api/templates/:id", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const template = await repository.find(c.get("workspaceId"), c.req.param("id"));
  return template ? c.json(template) : c.json({ error: "Template not found" }, 404);
});

app.post("/api/templates", async (c) => {
  const input = await c.req.json<Partial<Template>>();
  if (!input.title?.trim() || !input.body?.trim())
    return c.json({ error: "Title and prompt body are required" }, 422);

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
    const repository = new D1TemplateRepository(c.env.DB);
    return c.json(await repository.create(c.get("workspaceId"), created), 201);
  } catch {
    return c.json({ error: "A template with this name already exists" }, 409);
  }
});

app.put("/api/templates/:id", async (c) => {
  const input = await c.req.json<Partial<Template>>();
  if (!input.title?.trim() || !input.body?.trim())
    return c.json({ error: "Title and prompt body are required" }, 422);

  const repository = new D1TemplateRepository(c.env.DB);
  const existing = await repository.find(c.get("workspaceId"), c.req.param("id"));
  if (!existing) return c.json({ error: "Template not found" }, 404);

  const update: TemplateInput = {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    category: input.category?.trim() ?? existing.category,
    body: input.body,
    fields: input.fields ?? [],
  };
  const updated = await repository.update(c.get("workspaceId"), existing.id, update);
  return updated ? c.json(updated) : c.json({ error: "System examples cannot be edited" }, 403);
});

app.get("/api/templates/:id/revisions", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const template = await repository.find(c.get("workspaceId"), c.req.param("id"));
  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json(await repository.listRevisions(c.get("workspaceId"), template.id));
});

app.post("/api/templates/:id/revisions/:version/restore", async (c) => {
  const version = Number(c.req.param("version"));
  if (!Number.isInteger(version) || version < 1) return c.json({ error: "Invalid revision" }, 422);
  const repository = new D1TemplateRepository(c.env.DB);
  const restored = await repository.restoreRevision(
    c.get("workspaceId"),
    c.req.param("id"),
    version,
  );
  return restored ? c.json(restored) : c.json({ error: "Template or revision not found" }, 404);
});

app.delete("/api/templates/:id", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const deleted = await repository.delete(c.get("workspaceId"), c.req.param("id"));
  return deleted ? c.json({ deleted: true }) : c.json({ error: "Template not found" }, 404);
});

app.post("/api/templates/:id/compile", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const template = await repository.find(c.get("workspaceId"), c.req.param("id"));
  if (!template) return c.json({ error: "Template not found" }, 404);

  const values = await c.req.json<Record<string, string>>();
  const missing = template.fields
    .filter((field) => field.required && !values[field.key]?.trim())
    .map((field) => field.key);
  if (missing.length) return c.json({ error: "Required fields are missing", missing }, 422);

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
  return c.json({ text: segments.map((segment) => segment.text).join(""), segments });
});

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

export default app;
