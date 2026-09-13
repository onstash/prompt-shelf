# ADR 0008: Use native TanStack Start API routes

- Status: Accepted
- Date: 2026-09-12
- Supersedes: The compatibility-route portion of ADR 0007

## Context

ADR 0007 retained the previous Hono API behind a TanStack Start catch-all route to reduce migration risk. The application now has one deployment and stable raw `/api/*` contracts, so the compatibility framework adds an unnecessary runtime dependency and a second routing model.

## Decision

Handle the existing HTTP contracts directly in the TanStack Start `/api/$` server route. Keep Better Auth, authorization, validation, response bodies, status codes, and browser API paths unchanged.

Use the existing D1 repository as the persistence boundary. Do not introduce another routing or service abstraction solely to replace Hono.

## Consequences

- The application has one server routing model.
- The direct Hono dependency and compatibility application are removed.
- Existing browser callers keep the same `/api/*` contracts.
- The catch-all can be split into resource-specific TanStack Start routes later if its size becomes a maintenance problem.
- Hono may remain as a transitive dependency of third-party packages without being part of Prompt Shelf's runtime architecture.
