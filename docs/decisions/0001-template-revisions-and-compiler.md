# ADR-0001: Model prompts as immutable template revisions

## Status
Accepted

## Date
2025-09-09

## Context
Prompt Shelf needs a reusable template with a synchronized form and highlighted prompt preview. The prompt must remain portable, safe to render, and versionable.

## Decision
Store each template revision as an immutable prompt body plus an ordered field schema. Store submitted values separately. Compile the body at runtime using `{{field_key}}` tokens. Return plain text and structured `STATIC`/`VALUE` segments; render `<mark>` only in the frontend.

Use short text, long text, number, and select fields for the MVP.

## Alternatives considered

- Store HTML with `<mark>` tags: rejected because it couples storage to presentation and increases injection risk.
- Build a full expression language: rejected as unnecessary complexity.
- Mutate revisions in place: rejected because rollback and run history become ambiguous.

## Consequences

- The compiler can run locally for live previews and on the server for authoritative validation.
- Revisions remain available for read-only review. Restoration is deferred until its field-schema and saved-answer behavior is clearly defined.
- Conditional logic, loops, and computed fields are deferred.
