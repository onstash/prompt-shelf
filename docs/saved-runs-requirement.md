# Saved Runs Requirement

## Status

Implemented for copies of private, user-owned templates. System example copies never create runs.

## Requirement

Every successful prompt copy of a private, user-owned template must create a private saved run. A run records:

- Template ID
- Exact immutable template revision
- Submitted field values
- Creation timestamp

Templates without fields must store an empty values object (`{}`). A failed clipboard operation must not create a run.

## Why this is separate from analytics

The existing `prompt_copied` product event measures aggregate usage only. Privacy rules prohibit analytics from containing prompt text, field values, generated content, or client-provided identity.

Saved runs are private product data, protected by the authenticated workspace session. Analytics cannot substitute for saved-run persistence.

## Expected behavior

- Create a run only after the prompt is copied successfully.
- Never create runs for system example copies, whether the user is signed in or signed out.
- Derive identity and workspace ownership from the server session.
- Verify workspace access for every create, read, and delete operation.
- Preserve the exact revision association even after the template changes.
- Allow users to revisit a run, inspect its submitted values, reproduce the compiled prompt, copy it again, and delete it.
- Keep runs private by default.
- Do not treat a private template UUID as sharing authorization.

## Proposed API

```text
POST   /api/templates/:templateId/runs
GET    /api/runs
GET    /api/runs/:runId
DELETE /api/runs/:runId
```

The create request should contain only the submitted values and exact revision. User and workspace IDs must never be accepted from the client for authorization.

## Proposed persistence

Add the next ordered D1 migration rather than modifying an existing migration.

A saved run should minimally contain:

```text
id
workspace_id
template_id
template_version
values_json
created_at
```

The compiled prompt can be reproduced deterministically from the immutable revision and stored values, avoiding duplicate generated-content storage.

## Acceptance criteria

- Successful Copy of a private, user-owned template creates exactly one run.
- Copying a system example creates no run.
- Failed Copy creates no run.
- Zero-field templates create a run with `{}` values.
- Runs continue to use their original revision after later template edits.
- Users cannot access runs from another workspace, even when they know the run UUID.
- Revisit and delete controls work on mobile and desktop.
- Analytics remains best-effort and contains no saved-run content.
- Focused authorization, workspace-isolation, creation, retrieval, and deletion tests pass.

## Verification matrix

| Acceptance criterion | Evidence |
| --- | --- |
| Private Copy creates one run after clipboard success | `copy-and-save-run.test.ts` |
| System example Copy creates no run | Example copy paths omit run creation; `run-repository.test.ts` rejects examples |
| Failed clipboard Copy creates no run | `copy-and-save-run.test.ts` |
| Zero-field values remain `{}` and exact revisions are retained | `run-repository.test.ts` |
| Unauthenticated run endpoints are rejected | `run-api.test.ts` |
| Malformed create payloads are rejected | `run-api.test.ts` |
| Cross-workspace retrieval and deletion are rejected | `run-repository.test.ts` |
| Older runs remain reachable through bounded pages | `run-repository.test.ts` |
| Reproduction uses the canonical compiler | `compile-prompt.test.ts`; API and Saved Runs import `compilePrompt` |
| Run-list errors expose retry | `saved-runs.tsx` error state |
| Mobile and desktop revisit/delete behavior | Manual verification required before merge |
| Analytics excludes run content | Source inspection of `trackProductEvent` calls |
