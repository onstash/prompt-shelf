import assert from "node:assert/strict";
import test from "node:test";
import { createDb, type DbQueryLog } from "./db.ts";

type NoteRow = { body: string };

type FakeOptions = { fail?: boolean };
type FakeResult = { results: never[] };

/** Canned D1 stand-in. It records nothing and returns fixed rows, so tests stay focused on timing. */
function createFakeDatabase({ fail = false }: FakeOptions = {}) {
  const outcome = (): Promise<FakeResult> =>
    fail ? Promise.reject(new Error("UNIQUE constraint failed")) : Promise.resolve({ results: [] });
  const prepared = {
    bind: () => prepared,
    first: (): Promise<NoteRow | null> => Promise.resolve({ body: "first" }),
    all: () => outcome(),
    run: () => outcome(),
  };
  const fake = {
    prepare: () => prepared,
    batch: (statements: unknown[]) => Promise.all(statements.map(() => outcome())),
  };
  const testDatabase = Object.assign(fake, {
    exec: () => Promise.reject(new Error("Not implemented in this test fake")),
    withSession: () => {
      throw new Error("Not implemented in this test fake");
    },
    dump: () => Promise.reject(new Error("Not implemented in this test fake")),
  });
  const databaseBoundary: unknown = testDatabase;
  // SAFETY: the fake implements the D1 methods that createDb calls, with canned results.
  return databaseBoundary as D1Database;
}

test("logs duration, SQL text, and outcome for a query", async () => {
  const entries: DbQueryLog[] = [];
  const db = createDb(createFakeDatabase(), (entry) => entries.push(entry));

  const row = await db.query("SELECT body FROM notes WHERE id = ?").bind("a").first<NoteRow>();

  assert.equal(row?.body, "first");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.sql, "SELECT body FROM notes WHERE id = ?");
  assert.equal(entries[0]?.statements, 1);
  assert.equal(entries[0]?.outcome, "ok");
  assert.ok((entries[0]?.durationMs ?? -1) >= 0);
});

test("never logs bound values", async () => {
  const entries: DbQueryLog[] = [];
  const db = createDb(createFakeDatabase(), (entry) => entries.push(entry));
  const secret = "private prompt text that must not reach logs";

  await db.query("INSERT INTO notes (id, body) VALUES (?, ?)").bind("c", secret).run();

  assert.equal(JSON.stringify(entries).includes(secret), false);
});

test("logs one entry for a transaction with its statement count", async () => {
  const entries: DbQueryLog[] = [];
  const db = createDb(createFakeDatabase(), (entry) => entries.push(entry));

  const results = await db.transaction([
    db.query("UPDATE notes SET body = ? WHERE id = ?").bind("x", "a"),
    db.query("UPDATE notes SET body = ? WHERE id = ?").bind("y", "b"),
  ]);

  assert.equal(results.length, 2);
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.statements, 2);
});

test("logs failed queries as errors and rethrows", async () => {
  const entries: DbQueryLog[] = [];
  const db = createDb(createFakeDatabase({ fail: true }), (entry) => entries.push(entry));

  await assert.rejects(
    db.query("INSERT INTO notes (id, body) VALUES (?, ?)").bind("a", "b").run(),
    {
      message: "UNIQUE constraint failed",
    },
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.outcome, "error");
});

test("rejects transactions containing statements from another Db", async () => {
  const db = createDb(createFakeDatabase(), () => undefined);
  const other = createDb(createFakeDatabase(), () => undefined);

  await assert.rejects(db.transaction([other.query("SELECT 1")]), /not created by this Db/);
});

test("writes a db_query JSON line with the default logger", async (context) => {
  const lines: string[] = [];
  context.mock.method(console, "info", (line: string) => {
    lines.push(line);
  });
  const db = createDb(createFakeDatabase());

  await db.query("SELECT body FROM notes").all();

  assert.equal(lines.length, 1);
  const logged: unknown = JSON.parse(lines[0] ?? "{}");
  assert.deepEqual(Object.keys(logged ?? {}).sort(), [
    "durationMs",
    "event",
    "outcome",
    "sql",
    "statements",
  ]);
});
