# ADR 0007: Consolidate on TanStack Start and Cloudflare Workers

- Status: Accepted
- Date: 2026-09-11

## Context

Prompt Shelf previously used a Vite single-page application and a separate Hono Worker. Client-only screen state prevented durable template URLs and complicated authentication redirects. A second SSR Worker would add unnecessary cross-origin cookies and network calls between the frontend and API.

## Decision

Use TanStack Start as the application framework and deploy the frontend, server rendering, Better Auth handlers, Hono API compatibility routes, and D1 access in one Cloudflare Worker.

Use file-based routes for public and private screens. Keep raw `/api/*` HTTP contracts during the migration by forwarding the TanStack Start catch-all server route to the existing Hono application. Preserve D1 migrations and repository behavior unchanged.

## Consequences

- Pages have direct URLs and server-rendered HTML.
- Frontend and API requests are same-origin.
- Google OAuth and session cookies use one production origin.
- The standalone `server/` package is retired.
- Existing API clients remain compatible while server functions can replace internal HTTP calls incrementally.
- Private loaders and route-level authentication remain a follow-up; API authorization continues to be authoritative during this checkpoint.
