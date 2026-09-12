# Cloudflare learning notes

Prompt Shelf is a full-stack TanStack Start application deployed as one Cloudflare Worker. These notes record what the project uses, the underlying concepts, and useful next steps.

## Architecture

```text
Browser
  ↓
Cloudflare Worker
  ├── TanStack Start SSR and application routes
  ├── Static browser assets
  ├── Hono compatibility API routes
  ├── Better Auth and Google OAuth callbacks
  └── Cloudflare D1 access
```

Keeping these concerns on one origin simplifies cookies, OAuth callbacks, CORS, API calls, and deployment.

Production: <https://prompt-shelf-api.hastons.workers.dev>

## Worker configuration

`app/wrangler.jsonc` defines the deployed Worker:

```jsonc
{
  "name": "prompt-shelf-api",
  "main": "@tanstack/react-start/server-entry",
  "compatibility_flags": ["nodejs_compat"]
}
```

TanStack Start and the Cloudflare Vite plugin generate the deployable Worker entry during the build. Wrangler uploads that server bundle together with the client assets.

`nodejs_compat` makes many Node.js APIs available inside the Workers runtime. A Worker is still an isolate, not a persistent Node.js server: process memory and local files must not be treated as durable storage.

## D1 binding

The Worker receives D1 through the `DB` binding:

```jsonc
{
  "binding": "DB",
  "database_name": "prompt-shelf"
}
```

Application code accesses the database as `env.DB`. There is no database URL or password in application code. Cloudflare bindings grant a deployed Worker access to configured resources such as D1, R2, KV, Queues, and Durable Objects.

Database migrations are versioned in `app/migrations/` and applied separately:

```bash
npm run db:migrate:local
npm run db:migrate:remote
```

A Worker deployment does not automatically apply D1 migrations. Keeping those operations separate reduces the chance of an accidental production schema change.

## Build output

The production build has two main parts:

```text
dist/client  Browser JavaScript, CSS, fonts, and icons
dist/server  Worker code and SSR modules
```

Deployment size, Worker bundle size, and browser download size are different measurements. A large server module is not automatically downloaded by the browser. Route-level splitting keeps private template-editor code out of the initial public page download.

## Authentication and secrets

The application UI, API, authentication handlers, and OAuth callback use the same origin. Better Auth stores its session in a secure HTTP-only cookie, and server APIs derive identity from that session.

There are two separate kinds of secrets:

| Secret | Location | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions | Allows CI to deploy the Worker |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions | Selects the Cloudflare account |
| `BETTER_AUTH_SECRET` | Cloudflare Worker secrets | Protects application sessions |
| `GOOGLE_CLIENT_ID` | Cloudflare Worker secrets | Configures Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Cloudflare Worker secrets | Configures Google OAuth |

The deployment token is a control-plane credential and should use the least privilege necessary. It does not need D1 edit permission unless CI also applies migrations.

Local secrets belong in `app/.dev.vars`. They must not be committed or published as build artifacts.

## Analytics

Prompt Shelf uses two complementary analytics systems.

### Cloudflare Web Analytics

Cloudflare Web Analytics measures anonymous traffic and real-user performance through its browser beacon. The beacon is included only when this build variable is set:

```text
VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN
```

GitHub Actions maps it from the `CLOUDFLARE_WEB_ANALYTICS_TOKEN` repository or environment variable. The site token is public browser configuration, not a secret.

Available high-level metrics include:

- Visits and page views
- Page-load time
- Largest Contentful Paint (LCP)
- Interaction to Next Paint (INP)
- Cumulative Layout Shift (CLS)

Data can be filtered by country, host, path, referrer, device type, browser, operating system, navigation type, and bot classification. This can answer acquisition, browser support, device usage, page interest, and performance questions. TanStack Router transitions may appear as soft or routing-API navigations where the browser supports that measurement.

Cloudflare Web Analytics does not currently support custom product events. Its unsampled beacon data is retained for the most recent seven days; older data is aggregated with sampling around 10%.

### First-party product events

D1 stores aggregate product behavior that Cloudflare Web Analytics cannot capture:

```text
template_opened
form_started
prompt_copied
template_created
```

Migration `0003_product_events.sql` creates the event table. The browser submits only an event name and template ID. The server validates the event, verifies access to private templates, and derives any workspace ID from the authenticated session.

Product events intentionally exclude IP addresses, user IDs, email addresses, prompt text, field values, full user-agent strings, and precise locations. Analytics failures are best-effort and do not interrupt user actions.

The primary activation metric is:

```text
prompt_copied / template_opened
```

Cloudflare data and D1 event data can be compared as aggregate funnels, but they cannot be joined at an individual-user level. Use Cloudflare for traffic and performance questions; use D1 for product behavior questions.

Inspect aggregate product events locally with:

```bash
cd app
npx wrangler d1 execute prompt-shelf --local --command \
  "SELECT event_name, COUNT(*) AS total FROM product_events GROUP BY event_name"
```

Use `--remote` only after explicitly confirming that production access is intended.

## Continuous delivery

`.github/workflows/verify.yml` performs this flow:

```text
Pull request
  → install
  → format check
  → lint
  → build and type-check

Merge to main
  → verify again
  → build
  → wrangler deploy
  → production
```

The production job uses `needs: verify`, so it cannot deploy after a failed verification job. GitHub branch protection should prevent direct, unverified pushes to `main`.

Application deployment and database migration remain independent. Schema changes need an explicit migration step and a backward-compatibility plan.

## Core mental model

A Worker is conceptually a request handler:

```ts
export default {
  async fetch(request, env, context) {
    return new Response("Hello");
  },
};
```

For each request, Cloudflare:

1. Receives the request near the user.
2. Invokes the Worker in an isolate.
3. Supplies bindings such as `env.DB`.
4. Runs the matching page, asset, API, or authentication handler.
5. Returns a standard web `Response`.

Durable state belongs in D1 or another bound storage service. Worker memory is temporary and can only be used as an opportunistic cache.

## Useful commands

```bash
# Local application
npm run dev

# Production build
npm run build

# Manual production deployment
npm run deploy

# Inspect the authenticated Cloudflare account
cd app && npx wrangler whoami

# Follow production Worker logs
cd app && npx wrangler tail

# Apply D1 migrations
npm run db:migrate:local
npm run db:migrate:remote
```

## Next topics to learn

1. Create separate preview, staging, and production environments.
2. Give previews their own D1 database and secrets.
3. Add PR preview deployments without exposing secrets to forked pull requests.
4. Define a safe, backward-compatible production migration process.
5. Add a custom domain and update OAuth callbacks and canonical URLs.
6. Use Worker logs, exceptions, CPU-time metrics, and D1 analytics for observability.
7. Test rollback behavior by deploying and restoring a previous Worker version.

## Related decisions

- [`0002-cloudflare-d1-as-mvp-database.md`](decisions/0002-cloudflare-d1-as-mvp-database.md)
- [`0007-tanstack-start-cloudflare-application.md`](decisions/0007-tanstack-start-cloudflare-application.md)
