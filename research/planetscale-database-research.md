# PlanetScale database research

_Research date: 2025-09-09. Pricing and quotas should be rechecked before adoption._

## Summary

PlanetScale is not a good fit for Relay's current requirement to remain free until paying businesses are onboarded. The current official documentation describes paid PlanetScale Postgres and Vitess database clusters; the smallest documented Postgres Metal option starts at $60/month with 25 GB disk, and the pricing catalog is the source of truth for current configurations.

PlanetScale is technically attractive for a later paid production architecture, especially if database branching, managed Postgres, or Vitess-scale operations become valuable. For the MVP, Cloudflare D1 remains the selected database.

## Products

PlanetScale currently documents two database products:

- **PlanetScale Postgres**: managed PostgreSQL.
- **PlanetScale Vitess**: managed Vitess/MySQL-compatible architecture designed for horizontal scale.

For Relay, Postgres would be the relevant PlanetScale product because the application has conventional relational entities and JSONB-like flexible schema needs.

## Pricing and free availability

Official source: [PlanetScale Postgres pricing](https://planetscale.com/docs/postgres/pricing)

The official pricing page exposes a live pricing catalog. It states that each price is a monthly cluster cost and excludes possible additional storage, backups, egress, dedicated PgBouncers, and extra replicas.

The documented Postgres Metal table includes a smallest listed configuration of:

- 1/8 vCPU;
- 1 GB RAM;
- 25 GB disk;
- $60/month for AWS ARM;
- $70/month for AWS AMD.

PlanetScale's Postgres documentation also lists 25 GB disk with 50 GB included backup storage. Incoming public network traffic is documented as free; egress has separate regional pricing.

**Conclusion:** PlanetScale should not be treated as a $0 database option for this project. Unlike D1's explicit Workers Free quotas or Neon's $0 Free plan, the current PlanetScale database pricing documentation presents paid cluster configurations rather than a comparable free database tier.

## Branching

Official source: [PlanetScale Vitess pricing](https://planetscale.com/docs/vitess/pricing), [Vitess branching](https://planetscale.com/docs/vitess/schema-changes/branching)

PlanetScale supports database branches for development and schema changes. Vitess pricing documentation says approximately 1,440 hours of development branch time per month is included with the base plan. PlanetScale describes branching as a way to develop and test schema changes before deploying them to production.

This is useful, but branching does not make the platform free: the base production cluster remains a paid resource.

## Cloudflare Workers compatibility

Official source: [PlanetScale Postgres with Cloudflare Workers](https://planetscale.com/docs/postgres/tutorials/planetscale-postgres-cloudflare-workers)

PlanetScale documents Cloudflare Workers as an integration target. Therefore Cloudflare compute plus PlanetScale Postgres is technically feasible, but it still carries PlanetScale's paid database cost.

## Comparison for Relay

| Service | Database | Free path | Paid starting posture | Relay fit now |
|---|---|---|---|---|
| Cloudflare D1 | SQLite | Explicit free quotas; 500 MB/database | Usage-based Workers Paid | **Selected MVP** |
| Neon | PostgreSQL | $0 Free plan; 0.5 GB/project and 100 CU-hours/project/month | Usage-based Launch/Scale | Strong future option |
| PlanetScale | PostgreSQL / Vitess | No comparable $0 database tier found in current official pricing docs | Documented Postgres entry cluster starts at $60/month | Paid-growth option only |
| Convex | Reactive document database | $0 plan with included resource allowances | Usage-based/professional plans | Good for real-time apps, not needed |
| Turso | SQLite/libSQL | Free tier advertised; numeric quotas need direct verification | Usage-based plans | Alternative edge SQLite option |

## Decision impact

Do not change ADR-0002. Continue with:

```text
Cloudflare Pages + Workers + D1
```

Keep repository interfaces so migration to Neon or PlanetScale Postgres remains possible if a paying business requires PostgreSQL, larger capacity, or PlanetScale-specific operational features.

PlanetScale should be reconsidered only when one of these is true:

- a business customer funds the database cost;
- production PostgreSQL is a contractual requirement;
- PlanetScale branching/workflow materially improves the team;
- the application needs capabilities beyond D1 and Neon is not suitable.

## Primary sources

- https://planetscale.com/docs/postgres/pricing
- https://planetscale.com/docs/vitess/pricing
- https://planetscale.com/docs/vitess/schema-changes/branching
- https://planetscale.com/docs/postgres/tutorials/planetscale-postgres-cloudflare-workers
