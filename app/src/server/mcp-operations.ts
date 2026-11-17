import { z } from "zod";
import { compilePrompt } from "../lib/compile-prompt.ts";
import type { Db } from "./db.ts";
import { withinProposalLimit } from "./proposal-permissions.ts";
import { D1ProposalRepository } from "./proposal-repository.ts";
import { D1TemplateRepository } from "./template-repository.ts";

export const SEARCH_SCOPE = "prompt-shelf.search";
export const EXECUTE_SCOPE = "prompt-shelf.execute";

/** What a verified MCP access token allows, scoped to one workspace. */
export type Principal = {
  db: Db;
  workspaceId: string;
  clientId: string | null;
  scopes: ReadonlySet<string>;
};

const idSchema = z.string().min(1).max(100);

const fieldSchema = z
  .object({
    key: z.string().min(1).max(100),
    label: z.string().min(1).max(200),
    type: z.enum(["text", "textarea", "select", "number"]),
    required: z.boolean().optional(),
    options: z.array(z.string().max(200)).max(50).optional(),
  })
  .strict();

const schemas = {
  list_templates: z.object({}).strict(),
  get_template: z.object({ templateId: idSchema }).strict(),
  get_revision: z.object({ templateId: idSchema, version: z.number().int().positive() }).strict(),
  render_prompt: z
    .object({
      templateId: idSchema,
      values: z.record(z.string().max(100), z.string().max(10_000)),
    })
    .strict(),
  propose_update: z
    .object({
      templateId: idSchema,
      baseVersion: z.number().int().positive(),
      title: z.string().trim().min(1).max(200),
      description: z.string().max(1000).default(""),
      category: z.string().trim().min(1).max(100).default("General"),
      body: z.string().trim().min(1).max(20_000),
      fields: z.array(fieldSchema).max(50),
    })
    .strict(),
  propose_create: z
    .object({
      title: z.string().trim().min(1).max(200),
      description: z.string().max(1000).default(""),
      category: z.string().trim().min(1).max(100).default("General"),
      body: z.string().trim().min(1).max(20_000),
      fields: z.array(fieldSchema).max(50),
    })
    .strict(),
  get_proposal: z.object({ proposalId: idSchema }).strict(),
};

export const OPERATION_NAMES = [
  "list_templates",
  "get_template",
  "get_revision",
  "render_prompt",
  "propose_update",
  "propose_create",
  "get_proposal",
] as const;
export type OperationName = (typeof OPERATION_NAMES)[number];

/** A validated operation request. Parsed once at the MCP boundary, so operations get typed input. */
export const operationRequest = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("list_templates"), arguments: schemas.list_templates }).strict(),
  z.object({ operation: z.literal("get_template"), arguments: schemas.get_template }).strict(),
  z.object({ operation: z.literal("get_revision"), arguments: schemas.get_revision }).strict(),
  z.object({ operation: z.literal("render_prompt"), arguments: schemas.render_prompt }).strict(),
  z.object({ operation: z.literal("propose_update"), arguments: schemas.propose_update }).strict(),
  z.object({ operation: z.literal("propose_create"), arguments: schemas.propose_create }).strict(),
  z.object({ operation: z.literal("get_proposal"), arguments: schemas.get_proposal }).strict(),
]);
export type OperationRequest = z.infer<typeof operationRequest>;

const descriptions: Record<OperationName, string> = {
  list_templates: "List the prompt templates in the workspace.",
  get_template: "Get one template with its current body and fields.",
  get_revision: "Get one saved revision of a template.",
  render_prompt: "Fill a template's fields and return the prompt text for copying.",
  propose_update:
    "Propose a new version of a template. The owner must approve it in Prompt Shelf before it applies.",
  propose_create:
    "Propose a new template. A new template is created only after the owner approves it in Prompt Shelf.",
  get_proposal: "Get the status and content of a proposed update or new template.",
};

export type OperationResult = { ok: true; data: unknown } | { ok: false; error: string };

/** The catalog returned by the `search` tool. */
export function operationCatalog() {
  return OPERATION_NAMES.map((name) => ({
    name,
    description: descriptions[name],
    scope: EXECUTE_SCOPE,
    inputSchema: z.toJSONSchema(schemas[name]),
  }));
}

/** Runs one validated operation. The scope check happens before any database access. */
export async function executeOperation(
  principal: Principal,
  request: OperationRequest,
): Promise<OperationResult> {
  if (!principal.scopes.has(EXECUTE_SCOPE)) {
    return { ok: false, error: `Missing scope ${EXECUTE_SCOPE}` };
  }

  const templates = new D1TemplateRepository(principal.db);
  const proposals = new D1ProposalRepository(principal.db);
  const workspaceId = principal.workspaceId;

  switch (request.operation) {
    case "list_templates": {
      const list = await templates.list(workspaceId);
      return {
        ok: true,
        data: list.map((template) => ({
          id: template.id,
          title: template.title,
          description: template.description,
          category: template.category,
          version: template.version,
        })),
      };
    }
    case "get_template": {
      const template = await templates.find(workspaceId, request.arguments.templateId);
      if (!template) return { ok: false, error: "Template not found" };
      return { ok: true, data: template };
    }
    case "get_revision": {
      const revisions = await templates.listRevisions(workspaceId, request.arguments.templateId);
      const revision = revisions.find((item) => item.version === request.arguments.version);
      if (!revision) return { ok: false, error: "Revision not found" };
      return { ok: true, data: revision };
    }
    case "render_prompt": {
      const template = await templates.find(workspaceId, request.arguments.templateId);
      if (!template) return { ok: false, error: "Template not found" };
      const missing = template.fields
        .filter((field) => field.required && !request.arguments.values[field.key]?.trim())
        .map((field) => field.key);
      if (missing.length)
        return { ok: false, error: `Missing required fields: ${missing.join(", ")}` };
      return { ok: true, data: compilePrompt(template.body, request.arguments.values) };
    }
    case "propose_update": {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recent = await proposals.countSince(workspaceId, principal.clientId, since);
      if (!withinProposalLimit(recent)) {
        return { ok: false, error: "Too many proposals this hour. Try again later." };
      }
      const result = await proposals.create(
        workspaceId,
        request.arguments.templateId,
        request.arguments.baseVersion,
        {
          title: request.arguments.title,
          description: request.arguments.description,
          category: request.arguments.category,
          body: request.arguments.body,
          fields: request.arguments.fields,
        },
        principal.clientId,
      );
      if (result.status === "not_found") return { ok: false, error: "Template not found" };
      if (result.status === "read_only")
        return { ok: false, error: "System examples cannot be changed" };
      return { ok: true, data: result.proposal };
    }
    case "propose_create": {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recent = await proposals.countSince(workspaceId, principal.clientId, since);
      if (!withinProposalLimit(recent)) {
        return { ok: false, error: "Too many proposals this hour. Try again later." };
      }
      const result = await proposals.createNew(
        workspaceId,
        {
          title: request.arguments.title,
          description: request.arguments.description,
          category: request.arguments.category,
          body: request.arguments.body,
          fields: request.arguments.fields,
        },
        principal.clientId,
      );
      return { ok: true, data: result.status === "created" ? result.proposal : {} };
    }
    case "get_proposal": {
      const proposal = await proposals.find(workspaceId, request.arguments.proposalId);
      if (!proposal) return { ok: false, error: "Proposal not found" };
      return { ok: true, data: proposal };
    }
  }
}
