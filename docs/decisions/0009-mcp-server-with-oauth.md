# ADR-0009: Expose prompts through an MCP server with OAuth

## Status
Proposed

## Date
2026-11-17

## Context
AI clients such as ChatGPT and Codex should be able to search prompts, render them, and propose edits. Prompt Shelf already uses Better Auth on one Cloudflare Worker (ADR-0003, ADR-0007). LifeOS and Total Recall already use Better Auth to issue OAuth tokens for an MCP server. Those apps are separate, and their data stays with them.

## Decision

Host an MCP endpoint at `/mcp` inside the Prompt Shelf Worker. Prompt Shelf is both the authorization server and the resource server.

- Authorization uses Better Auth's `jwt()` and `mcp()` plugins, following LifeOS.
- Clients register dynamically. Unauthenticated registration is allowed, and the consent screen is always shown before access is granted.
- Scopes: `prompt-shelf.search`, `prompt-shelf.execute`, and `offline_access`. Proposing an edit uses `execute`. A proposal is harmless until approved in the browser, so a separate scope is not needed.
- Access tokens last about one hour. Refresh tokens last one week.
- The MCP surface has two tools, `search` and `execute`. Each operation checks its scope.
- Tokens are verified with `jose` against a local JWKS, since authorization and MCP run in the same Worker.
- Prompt Shelf does not approve anything through MCP. Approval is covered in ADR-0010.
- A token without the required scope gets an MCP tool error (`isError: true`) with the missing scope named. The HTTP status stays 200 because the MCP transport carries the error. Unauthenticated or invalid tokens get HTTP 401 with a `WWW-Authenticate` challenge.
- Access tokens last one hour and refresh tokens one week, set explicitly on the `mcp()` plugin.

## Alternatives considered

- **Extend Total Recall or LifeOS to proxy Prompt Shelf.** Rejected for v1. It would make another app own Prompt Shelf's authorization and data, which AGENTS.md rules against. It can be revisited if a single connection for all services becomes a requirement.
- **Personal access tokens.** Simpler, but browser-based connectors such as ChatGPT expect OAuth.
- **Pre-approved clients only.** Safer, but blocks new clients from connecting.
- **Client ID metadata documents instead of dynamic registration.** Available through `@better-auth/cimd` for Better Auth 1.7.13. Not chosen yet. Dynamic registration matches LifeOS, so it's the default until the CIMD flow is verified against Prompt Shelf.

## Consequences

- Prompt Shelf takes on OAuth operations: keys, token rotation, and revocation.
- Revoking a connected app must take effect immediately. A leaked refresh token works for up to a week until revoked.
- Unauthenticated registration lets any app create a client ID. Access still requires a signed-in user to approve it.
- Prompt Shelf needs its own migrations for the OAuth tables (ADR-0002).

## Revocation and rate limits

- Revoking a connection deletes its consent and its stored refresh and access tokens. Access tokens are verified by signature, so a token already held can work until it expires, at most one hour.
- Token and client registration endpoints are rate limited in the database (`rateLimit` table), so limits hold across Worker isolates.

