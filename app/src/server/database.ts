import { env } from "cloudflare:workers";
import { createDb, type Db } from "./db";

/** Returns the timed D1 wrapper for this Worker's `DB` binding. The only code that reads `DB`. */
export function getDb(): Db {
  return createDb(env.DB);
}
