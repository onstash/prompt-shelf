# ADR-0002: Use Cloudflare D1 for the zero-cost MVP database

## Status
Accepted

## Date
2025-09-09

## Context
The product should remain free while validating whether businesses will pay. The deployment target is Cloudflare. The initial data model is small and relational, but does not yet require advanced PostgreSQL features.

## Decision
Use Cloudflare Workers with Cloudflare D1 for the MVP. Keep database access behind repository interfaces so Neon Postgres can be introduced later if scale or SQL requirements justify it.

ADR-0007 supersedes the original split Workers/Pages deployment shape by consolidating the TanStack Start application and D1 access into one Worker.

## Alternatives considered

- Neon Postgres: preferred future migration target because of PostgreSQL portability, but adds a separate service and billing surface.
- Convex: rejected for now because its reactive platform model is unnecessary for the initial product.
- Turso: rejected for now because D1 provides tighter Cloudflare integration.

## Consequences

- The MVP can run within Cloudflare's free allowances.
- SQLite/D1 limits and Cloudflare coupling are accepted temporarily.
- Repository boundaries and export/import tooling must be maintained to preserve migration flexibility.
- Uploaded files belong in R2 later, not D1.
