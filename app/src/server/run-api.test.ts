import assert from "node:assert/strict";
import test from "node:test";
import type { Db } from "./db.ts";
import { handleRunRequest } from "./run-api.ts";

// SAFETY: these cases return before accessing the database.
const unusedDatabase = {} as Db;

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

test("rejects saved-run values beyond the size limits", async () => {
  const tooManyEntries = Object.fromEntries(
    Array.from({ length: 101 }, (_, index) => [`key${index}`, "v"]),
  );
  const oversizedValue = { name: "x".repeat(10_001) };

  for (const values of [tooManyEntries, oversizedValue]) {
    const response = await handleRunRequest(
      new Request("https://example.com/api/templates/template-id/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateVersion: 1, values }),
      }),
      "workspace-a",
      unusedDatabase,
    );
    assert.equal(response.status, 422);
  }
});
