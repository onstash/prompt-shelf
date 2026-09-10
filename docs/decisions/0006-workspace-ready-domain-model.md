# ADR-0006: Add workspace ownership from the beginning

## Status
Accepted

## Date
2025-09-09

## Context
The initial product targets individual users and must remain free, but businesses may become paying customers. Retrofitting team ownership later would be disruptive.

## Decision
Templates, runs, and future presets belong to a workspace. Users join workspaces through membership records with roles. The initial plan is `free`; business plans and billing are deferred.

## Alternatives considered

- User-owned data only: simpler initially, but expensive to migrate when introducing teams.
- Full multi-tenant billing now: rejected because it adds complexity before business demand is validated.

## Consequences

- Personal use is represented by a one-person workspace.
- Team sharing, roles, approvals, audit history, and business limits can be added incrementally.
- Workspace authorization must be checked on every protected resource.
