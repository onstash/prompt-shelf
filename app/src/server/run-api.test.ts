import assert from "node:assert/strict";
import test from "node:test";
import { handleRunRequest } from "./run-api.ts";

// SAFETY: these cases return before accessing the database.
const unusedDatabase = {} as D1Database;

for (const [method, path] of [
  ["POST", "/api/templates/template-id/runs"],
  ["GET", "/api/runs"],
  ["GET", "/api/runs/run-id"],
  ["DELETE", "/api/runs/run-id"],
] as const) {
  test(`rejects unauthenticated ${method} ${path}`, async () => {
    const response = await handleRunRequest(
      new Request(`https://example.com${path}`, { method }),
      null,
      unusedDatabase,
    );
    assert.equal(response.status, 401);
  });
}

test("rejects a malformed pagination cursor", async () => {
  const response = await handleRunRequest(
    new Request("https://example.com/api/runs?cursor=invalid"),
    "workspace-a",
    unusedDatabase,
  );
  assert.equal(response.status, 422);
});

test("rejects malformed run input", async () => {
  const response = await handleRunRequest(
    new Request("https://example.com/api/templates/template-id/runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateVersion: 0, values: [] }),
    }),
    "workspace-a",
    unusedDatabase,
  );
  assert.equal(response.status, 422);
});
