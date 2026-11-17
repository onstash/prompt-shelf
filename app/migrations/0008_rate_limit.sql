-- Better Auth database-backed rate limiting (storage: "database").
-- Counts are durable across Worker isolates, unlike in-memory counters.

CREATE TABLE rateLimit (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  lastRequest INTEGER NOT NULL
);
