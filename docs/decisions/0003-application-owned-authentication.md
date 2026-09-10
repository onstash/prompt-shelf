# ADR-0003: Use application-owned authentication for the MVP

## Status
Accepted

## Date
2025-09-09

## Context
Authentication must remain free and deploy naturally with Cloudflare. The product needs individual users and workspace membership, but not enterprise identity features initially.

## Decision
Use Better Auth with D1-backed users and sessions. Support email/password or magic-link authentication and Google OAuth initially. Use secure HTTP-only session cookies and Cloudflare Turnstile for abuse protection.

Keep authentication behind an internal `AuthProvider` interface.

## Alternatives considered

- Clerk/Auth0: faster setup, but introduces a priced external dependency and migration risk.
- Custom authentication without a library: rejected because password, session, and recovery security are easy to get wrong.
- Enterprise SSO/SAML: deferred until a paying business requires it.

## Consequences

- Auth remains within the free Cloudflare-oriented stack.
- The team owns more integration and operational responsibility.
- Enterprise SSO, SCIM, and advanced organization provisioning are deferred.
