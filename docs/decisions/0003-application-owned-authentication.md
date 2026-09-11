# ADR-0003: Use application-owned authentication for the MVP

## Status
Accepted

## Date
2025-09-09

## Context
Authentication must remain free and deploy naturally with Cloudflare. The product needs individual users and workspace membership, but not enterprise identity features initially.

## Decision
Use Better Auth with D1-backed users and sessions. Support Google OAuth only for the MVP and use secure HTTP-only session cookies. Derive application identity from the server-validated session rather than client-provided user identifiers.

Run Better Auth on the same TanStack Start Cloudflare Worker as the frontend and API, as established by ADR-0007.

## Alternatives considered

- Clerk/Auth0: faster setup, but introduces a priced external dependency and migration risk.
- Custom authentication without a library: rejected because OAuth and session security are easy to get wrong.
- Email/password and magic links: deferred to avoid registration, recovery, verification, and abuse-prevention complexity before demand exists.
- Enterprise SSO/SAML: deferred until a paying business requires it.

## Consequences

- Auth remains within the free Cloudflare-oriented stack.
- The team owns more integration and operational responsibility.
- Users must have a Google account during the MVP.
- Enterprise SSO, SCIM, and advanced organization provisioning are deferred.
