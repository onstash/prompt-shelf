import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, type AppBindings } from "./auth";
import { D1TemplateRepository, type Template, type TemplateInput } from "./template-repository";

type Variables = { workspaceId: string };
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

export default app;
