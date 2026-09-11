# ADR-0004: Use privacy-preserving first-party analytics

## Status
Accepted

## Date
2025-09-09

## Context
Prompt Shelf needs to learn whether templates are useful without paying for an analytics platform or collecting user prompt content.

## Decision
Use Cloudflare Web Analytics for anonymous website and performance metrics. Store a minimal first-party product-event table in D1 for events such as `template_opened`, `form_started`, `prompt_copied`, `preset_saved`, `template_created`, and `workspace_invited`.

Do not send prompt text, field values, uploaded documents, or generated AI responses to analytics.

## Alternatives considered

- PostHog: useful later for funnels, cohorts, feature flags, and session replay, but unnecessary for the MVP.
- Detailed third-party event tracking: rejected for cost and privacy reasons.

## Consequences

- The primary activation metric is `prompt_copied / template_opened`.
- Product analytics remain inexpensive and privacy-conscious.
- Advanced cohort and replay analysis can be added later if justified.
