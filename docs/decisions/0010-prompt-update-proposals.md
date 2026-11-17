# ADR-0010: Require browser approval for prompt update proposals

## Status
Proposed

## Date
2026-11-17

## Context
AI clients may suggest edits to a prompt, but a user must approve each edit before it becomes a new version. ADR-0001 requires immutable revisions, and the existing update path had no version check, so concurrent saves could overwrite each other.

## Decision

- An AI client creates a proposal. A proposal stores the full candidate content, `base_version` (the version the client started from), and its status (`pending`, `approved`, `rejected`, or `conflict`). Proposals are never edited after creation.
- Only a signed-in browser session with owner or admin role can approve or reject. MCP tokens cannot approve.
- Approval runs as one D1 batch. It inserts the next revision and updates the template's current version. Both statements check that the template is still at `base_version`.
- If the template changed since `base_version`, the proposal becomes `conflict`. The approver sees the diff against the current version and must rebase before approving.
- Before approval, the approver sees a server-computed diff: body changes, `{{key}}` token changes, field changes (flagging changes to key, type, or options), and metadata.
- Proposals are scoped to the workspace on every query.
- Approval does not require a content hash of the reviewed diff. For a single user with immutable proposals, the base-version check is sufficient. Revisit if proposals become editable or other users can approve them.

## Alternatives considered

- **Content-hash binding on approval.** Would guarantee the approver approves exactly what they reviewed. Deferred because proposals are immutable and there is one user; it costs little to add later.
- **Let the AI client approve proposals.** Rejected. It removes the user from the decision.
- **Last-write-wins updates.** Rejected. It lets a stale client overwrite newer edits.

## Consequences

- Approval is always a deliberate browser action by the user.
- A stale proposal cannot silently replace a newer version.
- Rejected and conflicting proposals stay visible until deleted, so the user can see what was suggested.
- The browser editor sends `baseVersion` on save, so direct edits follow the same version rule.

## Decision endpoints and limits

- Proposals are listed, read with a server-computed diff, approved, and rejected through browser-only `/api/proposals` endpoints. Those endpoints reject MCP bearer tokens.
- Only owners and admins may decide. Members may propose.
- Each client may create at most 20 proposals per hour in a workspace.

