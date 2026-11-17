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
  "0008_rate_limit.sql",
  "0009_proposal_creations.sql",
];

function createDatabase(files: readonly string[] = migrations) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const file of files) {
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

  assert.deepEqual(decision, { status: "approved", version: 2, templateId: "owned" });
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
    templateId: "owned",
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

type ProposalRowColumns = {
  kind: string;
  template_id: string;
  base_version: number;
  status: string;
};

function proposalRow(sqlite: DatabaseSync, id: string): ProposalRowColumns | undefined {
  // SAFETY: the query selects exactly these four columns from one proposal row.
  return sqlite
    .prepare(
      "SELECT kind, template_id, base_version, status FROM template_update_proposals WHERE id = ?",
    )
    .get(id) as ProposalRowColumns | undefined;
}

function revisionBody(sqlite: DatabaseSync, templateId: string): string | undefined {
  // SAFETY: the query selects one body column from the first revision of a template the test created.
  const row = sqlite
    .prepare("SELECT body FROM template_revisions WHERE template_id = ? AND version = 1")
    .get(templateId) as { body: string } | undefined;
  return row?.body;
}

function templateCount(sqlite: DatabaseSync, title: string) {
  // SAFETY: COUNT(*) always returns exactly one row with a numeric `total` column.
  return (
    sqlite.prepare("SELECT COUNT(*) AS total FROM templates WHERE title = ?").get(title) as {
      total: number;
    }
  ).total;
}

test("a creation proposal has no template until it is approved", async () => {
  const { repository, sqlite } = createDatabase();
  const created = await repository.createNew(
    "workspace-a",
    content({ title: "New prompt" }),
    "client-1",
  );

  assert.equal(created.status, "created");
  if (created.status !== "created") return;
  assert.equal(created.proposal.kind, "create");
  assert.equal(created.proposal.templateId, null);
  assert.equal(created.proposal.baseVersion, null);
  assert.equal(templateCount(sqlite, "New prompt"), 0);
});

test("approving a creation generates the template ID and creates version 1", async () => {
  const { repository, sqlite } = createDatabase();
  const created = await repository.createNew(
    "workspace-a",
    content({ title: "New prompt", body: "New {{name}}" }),
    null,
  );
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  const decision = await repository.approve("workspace-a", created.proposal.id, "user-1");

  assert.equal(decision.status, "approved");
  if (decision.status !== "approved") return;
  assert.equal(decision.version, 1);
  assert.equal(templateCount(sqlite, "New prompt"), 1);
  const revision = revisionBody(sqlite, decision.templateId);
  assert.equal(revision, "New {{name}}");
  const stored = await repository.find("workspace-a", created.proposal.id);
  assert.equal(stored?.appliedTemplateId, decision.templateId);
});

test("approving a creation twice does not create a second template", async () => {
  const { repository, sqlite } = createDatabase();
  const created = await repository.createNew("workspace-a", content({ title: "Once only" }), null);
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  await repository.approve("workspace-a", created.proposal.id, "user-1");
  const again = await repository.approve("workspace-a", created.proposal.id, "user-1");

  assert.deepEqual(again, { status: "not_pending" });
  assert.equal(templateCount(sqlite, "Once only"), 1);
});

test("rejecting a creation leaves no template behind", async () => {
  const { repository, sqlite } = createDatabase();
  const created = await repository.createNew(
    "workspace-a",
    content({ title: "Rejected prompt" }),
    null,
  );
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  assert.deepEqual(await repository.reject("workspace-a", created.proposal.id, "user-1"), {
    status: "rejected",
  });
  assert.equal(templateCount(sqlite, "Rejected prompt"), 0);
});

test("migration 0009 keeps existing update proposals intact", () => {
  const before = migrations.slice(0, 8);
  const { repository, sqlite } = createDatabase(before);
  void repository;
  sqlite.exec(`
    INSERT INTO templates (id, title, description, category, current_version, workspace_id)
      VALUES ('kept', 'Kept', '', 'General', 1, 'workspace-a');
    INSERT INTO template_revisions (template_id, version, body, fields_json)
      VALUES ('kept', 1, 'Old {{name}}', '[]');
    INSERT INTO template_update_proposals
      (id, workspace_id, template_id, base_version, title, body, fields_json, status, created_at)
      VALUES ('old-proposal', 'workspace-a', 'kept', 1, 'Kept edit', 'New {{name}}', '[]', 'pending', '2026-01-02T00:00:00.000Z');
  `);

  sqlite.exec(readFileSync(new URL(`../../migrations/${migrations[8]}`, import.meta.url), "utf8"));

  const row = proposalRow(sqlite, "old-proposal");
  assert.equal(row?.kind, "update");
  assert.equal(row?.template_id, "kept");
  assert.equal(row?.base_version, 1);
  assert.equal(row?.status, "pending");
});
