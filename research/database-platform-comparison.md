# Database platform comparison for Relay

_Research date: 2025-09-09. Prices and quotas can change; verify before deployment._

## Recommendation

Use **Neon Postgres on the Free plan for development and prototype production**, with Cloudflare Workers/Pages for compute and UI. Move to Neon Launch when the 0.5 GB/project, 100 CU-hours/project/month, 5 GB transfer/project/month, or production-feature requirements become limiting.

The app has relational entities—templates, immutable revisions, presets, runs, users, and permissions—so Postgres is the strongest long-term fit. Keep prompt fields and submitted values in JSONB while preserving relational foreign keys.

## Neon

Official docs: [Neon plans](https://neon.com/docs/introduction/plans), [Neon pricing](https://neon.com/pricing)

### Free

- $0/month.
- 100 projects.
- 10 branches per project.
- 100 CU-hours per project per month.
- Autoscaling up to 2 CU (approximately 8 GB RAM).
- 0.5 GB storage per project.
- 5 GB public network transfer per project per month.
- Free compute scales to zero after 5 minutes of inactivity.
- Extra branches are unavailable on Free.

### Paid

Neon Launch and Scale are usage-based with no minimum monthly fee according to the official plan documentation. The current published examples/rates include:

- Storage: $0.35/GB-month.
- Launch compute example: $0.106/CU-hour.
- Scale compute example: $0.222/CU-hour.
- Launch includes 500 GB public transfer/project, then $0.10/GB.

### Fit

Best fit for this product because it provides standard PostgreSQL, branching, SQL migrations, relational constraints, JSONB, and a conventional escape hatch from the vendor. A template manager is unlikely to hit 0.5 GB quickly; compute and network quotas are more likely than raw database size to matter first.

## Cloudflare D1

Official docs: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

D1 is Cloudflare's SQLite-based database.

### Free

- 10 databases per account.
- 500 MB maximum database size.
- 5 GB total account storage.
- 5 million rows read/day.
- 100,000 rows written/day.
- 7-day Time Travel duration.
- 50 queries per Worker invocation.

### Paid

Workers Paid currently provides:

- 50,000 databases per account.
- 10 GB maximum database size.
- 1 TB account storage.
- First 25 billion rows read/month included.
- First 50 million rows written/month included.
- First 5 GB storage included, then $0.75/GB-month.
- 30-day Time Travel duration.
- 1,000 queries per Worker invocation.

D1 has scale-to-zero billing: database compute hours/capacity are not billed; billing is based on rows read, rows written, and storage.

### Fit

Good if Cloudflare-only deployment and operational simplicity are the priorities. The Free 500 MB per database is ample for an early personal prompt manager, but it is a hard SQLite/Cloudflare-specific boundary and offers less future flexibility than Postgres.

## Convex

Official docs: [Convex pricing](https://www.convex.dev/pricing)

### Free / Starter

- $0/month base plan.
- 1 million function calls included; $2.20 per additional million.
- 20 GB-hours action compute included; $0.33 per additional GB-hour.
- 0.5 GB database storage included; $0.22 per additional GB.
- 1 GB file storage included; $0.033 per additional GB.
- 0.5 GB search storage included; $0.55 per additional GB.
- 1 GB database I/O included; $0.22 per additional GB.
- 3,000 search query-GBs included.
- 1 GB data egress included; $0.132 per additional GB.
- Reactive database and file storage are built in.

### Paid

Professional includes higher allowances, including 25 million function calls, 50 GB database storage, 100 GB file storage, and 50 GB database I/O; the official pricing page lists usage-based overage rates.

### Fit

Excellent for reactive TypeScript applications where real-time subscriptions are central. Less suitable if the project should remain a conventional Cloudflare Worker plus portable SQL backend. Convex is a platform decision, not merely a database swap.

## Turso

Official source: [Turso pricing](https://turso.tech/pricing)

Turso is a SQLite/libSQL service. Its pricing page advertises a free tier with unlimited databases and no credit card required, but the scraped page did not expose all numeric quota values reliably. Confirm the current storage, row-read, row-write, and database-size limits directly in the Turso dashboard/docs before selecting it.

### Fit

Interesting for edge-oriented SQLite and many-small-database architectures. It is less conventional than Neon Postgres and should be chosen intentionally for SQLite/libSQL compatibility.

## Comparison

| Service | Database model | Free storage basis | Strongest reason to choose | Main concern |
|---|---|---:|---|---|
| Neon | PostgreSQL | 0.5 GB/project | Relational durability and portability | Separate database vendor from Cloudflare |
| Cloudflare D1 | SQLite | 500 MB/database, 5 GB/account | Cloudflare-native simplicity | SQLite limits and vendor coupling |
| Convex | Managed reactive document database | 0.5 GB database storage | Real-time TypeScript development | Opinionated platform/runtime |
| Turso | SQLite/libSQL | Verify current quotas | Edge SQLite and many databases | Less conventional SQL ecosystem |

## Decision

For Relay:

```text
Cloudflare Pages/Workers
        |
        v
     Hono API
        |
        v
   Neon Postgres
        |
        +-- Cloudflare R2 later for uploaded files
        +-- Cloudflare KV later for cache/rate limits
```

Use D1 instead if the first release is deliberately small, Cloudflare-only, and expected to stay below 500 MB per database. Choose Convex only if reactive real-time behavior becomes a defining product requirement.

## Sources

- Neon official documentation: https://neon.com/docs/introduction/plans
- Neon official pricing: https://neon.com/pricing
- Cloudflare D1 official pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 official limits: https://developers.cloudflare.com/d1/platform/limits/
- Convex official pricing: https://www.convex.dev/pricing
- Turso official pricing: https://turso.tech/pricing
