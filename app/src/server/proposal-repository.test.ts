import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createDb } from "./db.ts";
import { D1ProposalRepository } from "./proposal-repository.ts";
import type { TemplateInput } from "./template-repository.ts";

const migrations = [
  "0001_templates.sql",
  "0002_auth_and_workspaces.sql",
  "0003_product_events.sql",
  "0004_saved_runs.sql",
  "0005_oauth_provider.sql",
  "0006_better_auth_column_names.sql",
  "0007_prompt_update_proposals.sql",
];

function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of migrations) {
    sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
  }
  sqlite.exec(`
    INSERT INTO workspaces (id, name) VALUES ('workspace-a', 'A'), ('workspace-b', 'B');
    INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
      VALUES ('user-1', 'User', 'user@example.com', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    INSERT INTO templates (id, title, description, category, current_version, workspace_id)
      VALUES ('owned', 'Owned', '', 'General', 1, 'workspace-a'),
             ('example', 'Example', '', 'General', 1, NULL);
    INSERT INTO template_revisions (template_id, version, body, fields_json)
      VALUES ('owned', 1, 'Hello {{name}}', '[]'), ('example', 1, 'Example', '[]');
  `);

  // Test adapter: implements the D1 methods used here. transaction runs in one SQLite transaction.
  const adapter = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      let parameters: SQLInputValue[] = [];
      const bound = {
        bind(...values: SQLInputValue[]) {
          parameters = values;
          return bound;
        },
        first() {
          return statement.get(...parameters) ?? null;
        },
        all() {
          return { results: statement.all(...parameters) };
        },
        run() {
          const result = statement.run(...parameters);
          return { meta: { changes: Number(result.changes) } };
        },
      };
      return bound;
    },
    async batch(statements: Array<{ run: () => { meta: { changes: number } } }>) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const testDatabase = Object.assign(adapter, {
    exec: () => Promise.reject(new Error("Not implemented in this test adapter")),
  });
  const databaseBoundary: unknown = testDatabase;
  // SAFETY: this adapter implements the D1 methods that createDb calls, backed by SQLite.
  const db = createDb(databaseBoundary as D1Database, () => undefined);
  return { repository: new D1ProposalRepository(db), sqlite };
}

const content = (overrides: Partial<TemplateInput> = {}): TemplateInput => ({
  title: "Owned",
  description: "",
  category: "General",
  body: "Hi {{name}}",
  fields: [{ key: "name", label: "Name", type: "text" }],
  ...overrides,
});

function revisionCount(sqlite: DatabaseSync, id: string) {
  // SAFETY: COUNT(*) always returns exactly one row with a numeric `total` column.
  return (
    sqlite
      .prepare("SELECT COUNT(*) AS total FROM template_revisions WHERE template_id = ?")
      .get(id) as { total: number }
  ).total;
}

test("creates a pending proposal and lists it", async () => {
  const { repository } = createDatabase();
  const result = await repository.create("workspace-a", "owned", 1, content(), "client-1");

  assert.equal(result.status, "created");
  if (result.status !== "created") return;
  assert.equal(result.proposal.status, "pending");
  assert.equal(result.proposal.baseVersion, 1);
  const pending = await repository.list("workspace-a", "pending");
  assert.deepEqual(
    pending.map((proposal) => proposal.id),
    [result.proposal.id],
  );
});

test("refuses proposals for other workspaces and for system examples", async () => {
  const { repository } = createDatabase();

  assert.deepEqual(await repository.create("workspace-b", "owned", 1, content(), null), {
    status: "not_found",
  });
  assert.deepEqual(await repository.create("workspace-a", "example", 1, content(), null), {
    status: "read_only",
  });
});

test("approval applies the proposal as the next revision", async () => {
  const { repository, sqlite } = createDatabase();
  const created = await repository.create(
    "workspace-a",
    "owned",
    1,
    content({ body: "Hey {{name}}" }),
    null,
  );
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  const decision = await repository.approve("workspace-a", created.proposal.id, "user-1");

  assert.deepEqual(decision, { status: "approved", version: 2 });
  assert.equal(revisionCount(sqlite, "owned"), 2);
  // SAFETY: the query selects two columns that the test seeded, and it returns no row when the revision is missing.
  const row = sqlite
    .prepare(
      "SELECT body, current_version FROM template_revisions r JOIN templates t ON t.id = r.template_id WHERE r.template_id = ? AND r.version = 2",
    )
    .get("owned") as { body: string; current_version: number } | undefined;
  assert.equal(row?.body, "Hey {{name}}");
  assert.equal(row?.current_version, 2);
  const stored = await repository.find("workspace-a", created.proposal.id);
  assert.equal(stored?.status, "approved");
  assert.equal(stored?.appliedVersion, 2);
});

test("a proposal based on an old version conflicts and writes nothing", async () => {
  const { repository, sqlite } = createDatabase();
  const first = await repository.create(
    "workspace-a",
    "owned",
    1,
    content({ body: "First {{name}}" }),
    null,
  );
  const second = await repository.create(
    "workspace-a",
    "owned",
    1,
    content({ body: "Second {{name}}" }),
    null,
  );
  assert.equal(first.status, "created");
  assert.equal(second.status, "created");
  if (first.status !== "created" || second.status !== "created") return;

  assert.deepEqual(await repository.approve("workspace-a", first.proposal.id, "user-1"), {
    status: "approved",
    version: 2,
  });
  const stale = await repository.approve("workspace-a", second.proposal.id, "user-1");

  assert.deepEqual(stale, { status: "conflict", currentVersion: 2 });
  assert.equal(revisionCount(sqlite, "owned"), 2);
  const stored = await repository.find("workspace-a", second.proposal.id);
  assert.equal(stored?.status, "conflict");
  assert.equal(stored?.appliedVersion, null);
});

test("a decided proposal cannot be decided again", async () => {
  const { repository } = createDatabase();
  const created = await repository.create("workspace-a", "owned", 1, content(), null);
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  assert.deepEqual(await repository.reject("workspace-a", created.proposal.id, "user-1"), {
    status: "rejected",
  });
  assert.deepEqual(await repository.approve("workspace-a", created.proposal.id, "user-1"), {
    status: "not_pending",
  });
});

test("approval and rejection are scoped to the owning workspace", async () => {
  const { repository } = createDatabase();
  const created = await repository.create("workspace-a", "owned", 1, content(), null);
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  assert.deepEqual(await repository.approve("workspace-b", created.proposal.id, "user-1"), {
    status: "not_found",
  });
  assert.deepEqual(await repository.reject("workspace-b", created.proposal.id, "user-1"), {
    status: "not_found",
  });
});
