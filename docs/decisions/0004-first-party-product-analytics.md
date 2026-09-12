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

## Implementation

Cloudflare Web Analytics is loaded only when `VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is configured. GitHub Actions reads the token from the `CLOUDFLARE_WEB_ANALYTICS_TOKEN` repository or environment variable.

Migration `0003_product_events.sql` stores the implemented product events:

- `template_opened`
- `form_started`
- `prompt_copied`
- `template_created`

The client submits only an event name and template ID. The server validates the event, verifies access to private templates, and derives the workspace from the authenticated session. It does not accept prompt content, field values, user IDs, or workspace IDs from the client. Analytics failures do not interrupt the user's workflow.

Events can be inspected locally with:

```bash
cd app
npx wrangler d1 execute prompt-shelf --local --command \
  "SELECT event_name, COUNT(*) AS total FROM product_events GROUP BY event_name"
```

Use `--remote` to query production after explicitly confirming that production access is intended.

## Alternatives considered

- PostHog: useful later for funnels, cohorts, feature flags, and session replay, but unnecessary for the MVP.
- Detailed third-party event tracking: rejected for cost and privacy reasons.

## Consequences

- The primary activation metric is `prompt_copied / template_opened`.
- Product analytics remain inexpensive and privacy-conscious.
- Advanced cohort and replay analysis can be added later if justified.
