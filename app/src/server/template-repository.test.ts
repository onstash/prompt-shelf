import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createDb } from "./db.ts";
import { D1TemplateRepository, type TemplateInput } from "./template-repository.ts";

// Test databases do not need query logs.
const quietLog = () => undefined;

function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'General',
      current_version INTEGER NOT NULL DEFAULT 1,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE template_revisions (
      template_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      body TEXT NOT NULL,
      fields_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (template_id, version),
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );
    INSERT INTO workspaces (id) VALUES ('workspace-a'), ('workspace-b');
    INSERT INTO templates (id, title, workspace_id, current_version)
      VALUES ('owned', 'Owned', 'workspace-a', 1),
             ('example', 'Example', NULL, 1);
    INSERT INTO template_revisions (template_id, version, body)
      VALUES ('owned', 1, 'Hello {{name}}'), ('example', 1, 'Example');
  `);

  // Test adapter: implements the D1 methods used here. batch() runs statements in one
  // transaction, matching D1's behavior: a failure rolls back every statement.
  const db = {
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
    // Runs statements in one transaction, matching D1: a failure rolls back every statement.
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
  const testDatabase = Object.assign(db, {
    exec: () => Promise.reject(new Error("Not implemented in this test adapter")),
    withSession: () => {
      throw new Error("Not implemented in this test adapter");
    },
    dump: () => Promise.reject(new Error("Not implemented in this test adapter")),
  });
  const databaseBoundary: unknown = testDatabase;
  // SAFETY: this adapter implements the D1 methods used by D1TemplateRepository against SQLite.
  // SAFETY: the test adapter implements the D1 methods that createDb calls.
  const wrapped = createDb(databaseBoundary as D1Database, quietLog);
  const repository = new D1TemplateRepository(wrapped);
  return { repository, sqlite };
}

const input = (overrides: Partial<TemplateInput> = {}): TemplateInput => ({
  title: "Owned",
  description: "",
  category: "General",
  body: "Hi {{name}}",
  fields: [{ key: "name", label: "Name", type: "text" }],
  ...overrides,
});

function revisionCount(sqlite: DatabaseSync, id: string) {
  // SAFETY: COUNT(*) always returns exactly one row with a numeric `total` column.
  return sqlite
    .prepare("SELECT COUNT(*) AS total FROM template_revisions WHERE template_id = ?")
    .get(id) as { total: number };
}

test("saves a new revision and bumps the version when the base version matches", async () => {
  const { repository } = createDatabase();
  const result = await repository.update("workspace-a", "owned", input(), 1);

  assert.equal(result.status, "updated");
  if (result.status !== "updated") return;
  assert.equal(result.template.version, 2);
  assert.equal(result.template.body, "Hi {{name}}");
});

test("uses the current version when no base version is supplied", async () => {
  const { repository } = createDatabase();
  const result = await repository.update("workspace-a", "owned", input());

  assert.equal(result.status, "updated");
});

test("rejects a stale base version without writing anything", async () => {
  const { repository, sqlite } = createDatabase();
  await repository.update("workspace-a", "owned", input({ body: "Second" }), 1);

  const stale = await repository.update("workspace-a", "owned", input({ body: "Lost" }), 1);

  assert.deepEqual(stale, { status: "conflict", currentVersion: 2 });
  assert.equal(revisionCount(sqlite, "owned").total, 2);
  const current = await repository.find("workspace-a", "owned");
  assert.equal(current?.body, "Second");
});

test("lets only one of two saves from the same base version succeed", async () => {
  const { repository, sqlite } = createDatabase();

  const [first, second] = await Promise.all([
    repository.update("workspace-a", "owned", input({ body: "A" }), 1),
    repository.update("workspace-a", "owned", input({ body: "B" }), 1),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["conflict", "updated"]);
  assert.equal(revisionCount(sqlite, "owned").total, 2);
});

test("rolls back the revision when the template update fails", async () => {
  const { repository, sqlite } = createDatabase();
  sqlite.exec(`
    CREATE TRIGGER fail_title BEFORE UPDATE ON templates
    WHEN NEW.title = 'BOOM'
    BEGIN SELECT RAISE(ABORT, 'forced failure'); END;
  `);

  await assert.rejects(
    repository.update("workspace-a", "owned", input({ title: "BOOM" }), 1),
    /forced failure/,
  );

  assert.equal(revisionCount(sqlite, "owned").total, 1);
  const current = await repository.find("workspace-a", "owned");
  assert.equal(current?.version, 1);
  assert.equal(current?.title, "Owned");
});

test("refuses to edit system examples", async () => {
  const { repository, sqlite } = createDatabase();
  const result = await repository.update("workspace-a", "example", input(), 1);

  assert.deepEqual(result, { status: "read_only" });
  assert.equal(revisionCount(sqlite, "example").total, 1);
});

test("reports templates from another workspace as not found", async () => {
  const { repository, sqlite } = createDatabase();
  const result = await repository.update("workspace-b", "owned", input(), 1);

  assert.deepEqual(result, { status: "not_found" });
  assert.equal(revisionCount(sqlite, "owned").total, 1);
});
