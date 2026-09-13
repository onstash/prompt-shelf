# AGENTS.md

Instructions for coding agents working in this repository.

Read [`MEMORY.md`](./MEMORY.md) before planning, implementing, or reporting changes. It records prior mistakes and required corrective practices.

## Product boundaries

Prompt Shelf is a general-purpose prompt workflow manager. Users define reusable templates, fill typed variables, preview deterministic output, and copy that output into an external AI tool.

- Keep prompt execution external and copy-first.
- Keep private templates private by default.
- Do not specialize the product for health content or one AI provider.
- Keep the MVP free until business demand supports paid features.

## Architecture

`app/` is the only deployable application. TanStack Start serves SSR pages, static assets, Better Auth, Hono compatibility endpoints, and D1 access from one Cloudflare Worker.

Important paths:

```text
app/src/routes/                 File-based routes and route metadata
app/src/screens/                Page state and orchestration
app/src/components/             Reusable interface components
app/src/lib/api.ts              Central browser API client
app/src/server/api.ts           Hono compatibility API
app/src/server/auth.ts          Better Auth configuration
app/src/server/template-repository.ts  D1 persistence
app/migrations/                 Ordered D1 migrations
docs/decisions/                 Architecture decision records
```

Read the relevant ADR before changing authentication, persistence, analytics, ownership, prompt execution, or deployment architecture.

## Non-negotiable rules

1. Derive identity from the server session. Never accept client-provided user or workspace IDs as authorization.
2. Check workspace access for every private resource. Knowing a template UUID is not permission.
3. Preserve migration filenames and order. Add a new migration instead of editing one already used remotely.
4. Use TanStack Router APIs for internal navigation and React Query for server state. Do not use `window.location.assign` for application routes.
5. Keep analytics best-effort and free of prompt text, field values, documents, generated content, raw IPs, emails, full user agents, or precise locations.

## Implementation conventions

- Centralize browser HTTP calls in `app/src/lib/api.ts`.
- Keep `PageContainer` limited to layout.
- Prefer explicit early-return subtrees for loading, signed-out, error, and ready states.
- Keep public routes separate from private routes. Future shared templates use `/p/:shareSlug`, never a private template UUID as a credential.
- Use Base UI and existing shadcn components before creating new primitives.
- Preserve keyboard access, visible focus, responsive layouts, and reduced-motion behavior.
- Do not edit `app/src/routeTree.gen.ts`; TanStack Router generates it.
- Never commit `.dev.vars`, `.env.local`, `.wrangler`, `.tanstack`, or generated `dist` output.

## Database changes

1. Add the next numbered SQL file under `app/migrations/`.
2. Apply it locally with `npm run db:migrate:local`.
3. Verify code against local D1.
4. Apply it remotely with `npm run db:migrate:remote` before deploying dependent code.

Database migration and Worker deployment are separate operations by design.

## Verification

Run these before requesting review or committing:

```bash
npm run format:check
npm run lint
npm run build
```

When behavior changes, add focused tests if the repository has coverage for that area. At minimum, manually verify affected public routes, private authorization, and direct URL loading.

## Git and releases

- Use Conventional Commits: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `build:`, `ci:`, or `chore:`.
- Keep the subject concise and written in Simple Technical English.
- Do not commit unless the user explicitly asks for a commit.
- Do not rewrite, reset, or discard user changes.
- Release Please owns `app/CHANGELOG.md`, app version updates, `vX.Y.Z` tags, and GitHub Releases.
- Never move a published release tag; create a patch release instead.

## Documentation

Update documentation when changing public APIs, setup steps, product behavior, or operational workflows. Record expensive-to-reverse decisions as the next numbered ADR in `docs/decisions/`; do not delete historical ADRs.
