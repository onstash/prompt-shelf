/**
 * Timed D1 wrapper. The only module that calls D1 methods directly.
 *
 * Every query is timed with `performance.now()` and logged with its SQL text, duration, and
 * outcome. Bound values are never logged, so prompt text and field values stay out of logs.
 */

export type DbValue = string | number | boolean | null;

export type DbQueryLog = {
  sql: string;
  statements: number;
  durationMs: number;
  outcome: "ok" | "error";
};

export type DbLogger = (entry: DbQueryLog) => void;

export interface DbStatement {
  bind(...values: DbValue[]): DbStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}

export interface Db {
  /** Application code uses `query` and `transaction`. */
  query(sql: string): DbStatement;
  /** Atomic batch of statements, run as one D1 transaction. */
  transaction(statements: readonly DbStatement[]): Promise<D1Result[]>;
  /** Kept only so Better Auth's D1 adapter can use this wrapper. Timed the same way as `query`. */
  prepare(sql: string): DbStatement;
  /** Kept only so Better Auth's D1 adapter can use this wrapper. Timed the same way as `transaction`. */
  batch(statements: readonly DbStatement[]): Promise<D1Result[]>;
  /** Kept only because Better Auth detects D1 by the presence of `exec`. Timed like the other methods. */
  exec(sql: string): Promise<D1ExecResult>;
}

const MAX_LOGGED_SQL_LENGTH = 200;

function logToConsole(entry: DbQueryLog): void {
  console.info(JSON.stringify({ event: "db_query", ...entry }));
}

function summarizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().slice(0, MAX_LOGGED_SQL_LENGTH);
}

async function timed<T>(
  sql: string,
  statements: number,
  log: DbLogger,
  operation: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  let outcome: DbQueryLog["outcome"] = "ok";
  try {
    return await operation();
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    log({
      sql: summarizeSql(sql),
      statements,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      outcome,
    });
  }
}

type Created = { sql: string; raw: D1PreparedStatement };

export function createDb(database: D1Database, log: DbLogger = logToConsole): Db {
  const created = new WeakMap<DbStatement, Created>();

  function wrap(sql: string, raw: D1PreparedStatement): DbStatement {
    const statement: DbStatement = {
      bind: (...values) => wrap(sql, raw.bind(...values)),
      first: <T>() => timed(sql, 1, log, () => raw.first<T>()),
      all: <T>() => timed(sql, 1, log, () => raw.all<T>()),
      run: <T>() => timed(sql, 1, log, () => raw.run<T>()),
    };
    created.set(statement, { sql, raw });
    return statement;
  }

  const prepare = (sql: string) => wrap(sql, database.prepare(sql));
  const batch = async (statements: readonly DbStatement[]) => {
    const parts = statements.map((statement) => {
      const part = created.get(statement);
      if (!part) throw new Error("Statement was not created by this Db");
      return part;
    });
    const sql = parts.map((part) => part.sql).join("; ");
    return timed(sql, parts.length, log, () => database.batch(parts.map((part) => part.raw)));
  };
  const exec = (sql: string) => timed(sql, 1, log, () => database.exec(sql));
  return { query: prepare, transaction: batch, prepare, batch, exec };
}
