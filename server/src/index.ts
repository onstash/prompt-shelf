import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  required?: boolean;
  options?: string[];
};
type Template = {
  id: string;
  title: string;
  description: string;
  category: string;
  body: string;
  fields: Field[];
  version: number;
};
const template: Template = {
  id: "clear-first-draft",
  title: "Clear first draft",
  description: "Turn a rough idea into a clear, useful first draft without losing your own voice.",
  category: "Writing",
  body: "You are a thoughtful writing partner.\n\nCreate a {{idea}} for {{audience}} in a {{tone}} voice. Keep it {{length}} and easy to scan.\n\nStart with the clearest version of the idea, remove filler, and preserve the writer's intent. Do not invent facts or make the tone sound generic.",
  version: 3,
  fields: [
    { key: "idea", label: "What are you writing?", type: "textarea", required: true },
    { key: "audience", label: "Who is it for?", type: "text", required: true },
    {
      key: "tone",
      label: "Tone",
      type: "select",
      options: ["clear and conversational", "warm and encouraging", "direct and confident"],
    },
    {
      key: "length",
      label: "Length",
      type: "select",
      options: ["short and skimmable", "a few useful paragraphs", "detailed and thorough"],
    },
  ],
};
const templates = new Map<string, Template>([[template.id, template]]);
const app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ ok: true, service: "prompt-shelf-api" }));
app.get("/api/templates", (c) => c.json([...templates.values()]));
app.get("/api/templates/:id", (c) => {
  const found = templates.get(c.req.param("id"));
  return found ? c.json(found) : c.json({ error: "Template not found" }, 404);
});
app.post("/api/templates", async (c) => {
  const input = await c.req.json<Partial<Template>>();
  if (!input.title?.trim() || !input.body?.trim())
    return c.json({ error: "Title and prompt body are required" }, 422);
  const created = {
    ...template,
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
  };
  templates.set(created.id, created);
  return c.json(created, 201);
});
app.post("/api/templates/:id/compile", async (c) => {
  const selected = templates.get(c.req.param("id"));
  if (!selected) return c.json({ error: "Template not found" }, 404);
  const values = await c.req.json<Record<string, string>>();
  const missing = selected.fields
    .filter((f) => f.required && !values[f.key]?.trim())
    .map((f) => f.key);
  if (missing.length) return c.json({ error: "Required fields are missing", missing }, 422);
  const segments: { type: "static" | "value"; text: string; key?: string }[] = [];
  let last = 0;
  const token = /{{\s*([\w-]+)\s*}}/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(selected.body))) {
    if (match.index > last)
      segments.push({ type: "static", text: selected.body.slice(last, match.index) });
    segments.push({ type: "value", key: match[1], text: values[match[1]] ?? "" });
    last = match.index + match[0].length;
  }
  if (last < selected.body.length)
    segments.push({ type: "static", text: selected.body.slice(last) });
  return c.json({ text: segments.map((s) => s.text).join(""), segments });
});
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) =>
  console.log(`Prompt Shelf API listening on http://localhost:${info.port}`),
);
