import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { D1RunRepository } from "./run-repository.ts";

function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE workspaces (id TEXT PRIMARY KEY);
    CREATE TABLE templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE
    );
    CREATE TABLE template_revisions (
      template_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      body TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      PRIMARY KEY (template_id, version),
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );
    CREATE TABLE saved_runs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL,
      template_version INTEGER NOT NULL,
      values_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id, template_version)
        REFERENCES template_revisions(template_id, version) ON DELETE CASCADE
    );
    INSERT INTO workspaces (id) VALUES ('workspace-a'), ('workspace-b');
    INSERT INTO templates (id, title, workspace_id)
      VALUES ('owned-template', 'Owned template', 'workspace-a'),
             ('system-example', 'System example', NULL);
    INSERT INTO template_revisions (template_id, version, body, fields_json)
      VALUES ('owned-template', 1, 'Hello {{name}}', '[]'),
             ('owned-template', 2, 'Hi {{name}}', '[]'),
             ('system-example', 1, 'Example', '[]');
  `);

  const db = {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      let parameters: SQLInputValue[] = [];
      return {
        bind(...values: SQLInputValue[]) {
          parameters = values;
          return this;
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
    },
  };
  const testDatabase = Object.assign(db, {
    batch: () => Promise.reject(new Error("Not implemented in this test adapter")),
    exec: () => Promise.reject(new Error("Not implemented in this test adapter")),
    withSession: () => {
      throw new Error("Not implemented in this test adapter");
    },
    dump: () => Promise.reject(new Error("Not implemented in this test adapter")),
  });
  const databaseBoundary: unknown = testDatabase;
  // SAFETY: this adapter implements the D1 methods used by D1RunRepository against SQLite.
  return { repository: new D1RunRepository(databaseBoundary as D1Database), sqlite };
}

test("creates a run with exact revision and empty values", async () => {
  const { repository } = createDatabase();
  const run = await repository.create("workspace-a", "owned-template", 1, {});

  assert.ok(run);
  assert.equal(run.templateVersion, 1);
  assert.deepEqual(run.values, {});
  assert.equal(run.body, "Hello {{name}}");
});

test("rejects system examples and templates from another workspace", async () => {
  const { repository } = createDatabase();

  assert.equal(await repository.create("workspace-a", "system-example", 1, {}), null);
  assert.equal(await repository.create("workspace-b", "owned-template", 1, {}), null);
  assert.equal(await repository.create("workspace-a", "owned-template", 99, {}), null);
});

test("paginates runs without hiding older entries", async () => {
  const { repository } = createDatabase();
  for (let index = 0; index < 27; index += 1)
    assert.ok(
      await repository.create("workspace-a", "owned-template", 1, { index: String(index) }),
    );

  const firstPage = await repository.list("workspace-a");
  assert.equal(firstPage.runs.length, 25);
  assert.ok(firstPage.nextCursor);

  const secondPage = await repository.list("workspace-a", firstPage.nextCursor);
  assert.equal(secondPage.runs.length, 2);
  assert.equal(secondPage.nextCursor, null);
  assert.equal(new Set([...firstPage.runs, ...secondPage.runs].map((run) => run.id)).size, 27);
});

test("scopes retrieval and deletion to the owning workspace", async () => {
  const { repository } = createDatabase();
  const run = await repository.create("workspace-a", "owned-template", 2, { name: "Sam" });
  assert.ok(run);

  assert.equal(await repository.find("workspace-b", run.id), null);
  assert.equal(await repository.delete("workspace-b", run.id), false);
  assert.ok(await repository.find("workspace-a", run.id));
  assert.equal(await repository.delete("workspace-a", run.id), true);
  assert.equal(await repository.find("workspace-a", run.id), null);
});
