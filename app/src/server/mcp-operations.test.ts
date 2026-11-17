import assert from "node:assert/strict";
import test from "node:test";
import type { Db } from "./db.ts";
import {
  EXECUTE_SCOPE,
  executeOperation,
  operationCatalog,
  operationRequest,
  type Principal,
} from "./mcp-operations.ts";

// SAFETY: these tests only use paths that return before any database access.
const unusedDatabase = {} as Db;

function principal(scopes: string[]): Principal {
  return {
    db: unusedDatabase,
    workspaceId: "personal-user-1",
    clientId: null,
    scopes: new Set(scopes),
  };
}

test("catalog lists every operation under the execute scope with a JSON schema", () => {
  const catalog = operationCatalog();

  assert.deepEqual(
    catalog.map((operation) => operation.name),
    [
      "list_templates",
      "get_template",
      "get_revision",
      "render_prompt",
      "propose_update",
      "propose_create",
      "get_proposal",
    ],
  );
  for (const operation of catalog) {
    assert.equal(operation.scope, EXECUTE_SCOPE);
    assert.equal(operation.inputSchema.type, "object");
  }
});

test("refuses every operation without the execute scope", async () => {
  const result = await executeOperation(principal(["prompt-shelf.search"]), {
    operation: "list_templates",
    arguments: {},
  });

  assert.deepEqual(result, { ok: false, error: `Missing scope ${EXECUTE_SCOPE}` });
});

test("rejects unknown operations at the boundary", () => {
  const parsed = operationRequest.safeParse({ operation: "delete_everything", arguments: {} });

  assert.equal(parsed.success, false);
});

test("rejects a proposal with an empty body at the boundary", () => {
  const parsed = operationRequest.safeParse({
    operation: "propose_update",
    arguments: { templateId: "owned", baseVersion: 1, title: "Draft", body: "   ", fields: [] },
  });

  assert.equal(parsed.success, false);
});

test("rejects unexpected arguments at the boundary", () => {
  const parsed = operationRequest.safeParse({
    operation: "get_template",
    arguments: { templateId: "owned", extra: true },
  });

  assert.equal(parsed.success, false);
});

test("accepts a well-formed proposal request", () => {
  const parsed = operationRequest.safeParse({
    operation: "propose_update",
    arguments: {
      templateId: "owned",
      baseVersion: 1,
      title: "Draft",
      body: "Hi {{name}}",
      fields: [],
    },
  });

  assert.equal(parsed.success, true);
});
