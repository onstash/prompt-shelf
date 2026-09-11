import { Hono } from "hono";
import { cors } from "hono/cors";
import { D1TemplateRepository, type Template, type TemplateInput } from "./template-repository";

type Bindings = { DB: D1Database };
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());
app.get("/health", (c) => c.json({ ok: true, service: "prompt-shelf-api" }));

app.get("/api/templates", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  return c.json(await repository.list());
});

app.get("/api/templates/:id", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const template = await repository.find(c.req.param("id"));
  return template ? c.json(template) : c.json({ error: "Template not found" }, 404);
});

app.post("/api/templates", async (c) => {
  const input = await c.req.json<Partial<Template>>();
  if (!input.title?.trim() || !input.body?.trim())
    return c.json({ error: "Title and prompt body are required" }, 422);

  const created: Template = {
    id: input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
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
    return c.json(await repository.create(created), 201);
  } catch {
    return c.json({ error: "A template with this name already exists" }, 409);
  }
});

app.put("/api/templates/:id", async (c) => {
  const input = await c.req.json<Partial<Template>>();
  if (!input.title?.trim() || !input.body?.trim())
    return c.json({ error: "Title and prompt body are required" }, 422);

  const repository = new D1TemplateRepository(c.env.DB);
  const existing = await repository.find(c.req.param("id"));
  if (!existing) return c.json({ error: "Template not found" }, 404);

  const update: TemplateInput = {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    category: input.category?.trim() ?? existing.category,
    body: input.body,
    fields: input.fields ?? [],
  };
  return c.json(await repository.update(existing.id, update));
});

app.post("/api/templates/:id/compile", async (c) => {
  const repository = new D1TemplateRepository(c.env.DB);
  const template = await repository.find(c.req.param("id"));
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
