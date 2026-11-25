# Shared design system research

_Research date: 2026-11-17. This is a proposal, not an architecture decision or an implementation._

## Summary

A versioned React UI package can own semantic tokens, styled shadcn-derived components, Base UI behavior, and reusable layout primitives. Product workspaces can compose those APIs without styling class names; the UI package retains Tailwind classes. Publish the package for cross-repository use and enforce the boundary in each consumer's CI. This requires a separate policy for native JSX elements: shadcn/lint alone does not enforce it.

## Verified starting point

Prompt Shelf has one deployable app, not a shared UI package. Its [component directory](../app/src/components/ui) contains the current UI primitives; [components.json](../app/components.json) points there and selects `base-nova`, CSS variables, and `src/index.css`. The [app package](../app/package.json) uses Base UI, Tailwind 4 and shadcn, and declares Oxlint `^1.79.0`; the locally installed version checked during this research is 1.86.0. Its lint command explicitly selects [oxlint.config.ts](../app/oxlint.config.ts), which already registers a local JS plugin. Do not assume the adjacent `.oxlintrc.json` governs that command. Product components and screens must be inventoried before estimating migration work. No product code was changed in this research.

Base UI provides unstyled interactive building blocks; styling and composition remain the application's responsibility ([Base UI quick start](https://base-ui.com/react/overview/quick-start)). shadcn's [monorepo guidance](https://ui.shadcn.com/docs/monorepo) supports a shared UI workspace, but copying source into each consumer via a registry and importing a versioned package are different distribution models.

## Proposed boundary and distribution

1. Extract generic primitives, tokens, typography and layout components into a separately versioned `@org/ui` package. Keep product-specific behavior in Prompt Shelf; add reusable semantic variants and layout APIs as actual needs emerge. Preserve accessibility, responsive behavior, focus and reduced motion. Avoid a catch-all `className` escape hatch in product-facing APIs if the goal is no product styling classes.
2. Use the package in a pnpm workspace during extraction, then publish the same versioned artifact to an agreed private or public package registry for other repositories. Declare compatible React and other peer dependencies; document exports, CSS entry points, versioning, upgrade and release ownership. Package distribution gives consumers controlled upgrades; a [shadcn registry](https://ui.shadcn.com/docs/registry) distributes source for local ownership and divergence, so updates require a separate synchronization process. A registry can complement a package, but does not itself guarantee shared updates.
3. Choose a CSS contract. Either ship compiled CSS with documented tokens, ordering and collision/Preflight behavior, or have each consumer compile package sources with compatible Tailwind and theme configuration. Tailwind scans text for complete class names; dependencies are generally ignored by default, so source-distributed classes may require explicit `@source` registration. Dynamic class fragments are not reliably generated. Validate production CSS in a real consumer ([Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files)). Do not assume shipping CSS eliminates version, cascade or token conflicts.

## Enforcement

[shadcn/lint](https://github.com/shadcn-ui/lint) offers `no-restyle`, raw-color, arbitrary-value, inline-style, unknown-class and static-class rules. Its [`no-restyle` documentation](https://github.com/shadcn-ui/lint/blob/main/docs/rules/no-restyle.md) explicitly limits the rule to recognized design-system components: native elements such as `<div className="...">` and unrelated components are outside its scope. Its wrapper analysis also has documented gaps. Without `allow` or `deny`, it reports classes on recognized components, including layout; `allow: ["layout"]` deliberately permits some classes and therefore does not meet the stricter goal. Recognition of a published package and wrappers must be tested with `componentImports` and actual exports, not assumed.

For the stricter product boundary, propose an additional AST-based lint rule covering JSX `className` on intrinsic elements and components, expressions, spreads and aliases as defined by policy. Explicitly decide whether to prohibit all product `className` attributes or only styling uses: static analysis cannot reliably distinguish styling from every integration or test hook. Address `style`, `<style>`, CSS imports, helper calls and spread props separately; banning a single attribute is not a complete styling boundary. Prefer semantic props, data attributes for tests, and narrowly documented exceptions with owners over silent bypasses. Restrict product imports of internal UI paths and direct Base UI primitives if they circumvent the public API. Keep rules scoped to product directories; permit styling inside the UI package, with token and accessibility checks appropriate there. Shared lint configuration should travel as a versioned package, with repository-specific paths and explicit exceptions.

The upstream [setup](https://github.com/shadcn-ui/lint/blob/main/README.md) requires Node 20.19+ and Oxlint 1.80+ for its Oxlint integration. The app declares Oxlint `^1.79.0`; check the resolved version and upgrade deliberately if needed. Oxlint registers ESLint-compatible JS plugins with `jsPlugins` and supports per-path overrides; its JS plugin API is alpha, and compatibility must be tested with the exact versions and configuration ([Oxlint JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html), [configuration reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html)). Preserve the existing plugin and rules. Do not install a second linter merely on the assumption that the integration works.

## Validation and rollout proposal

- Inventory product class attributes, inline styles, CSS and imports; classify reusable patterns and exceptional integrations before choosing APIs. Establish a baseline and migrate one representative workflow first.
- Add fixture-based policy tests proving rejection of native and recognized component classes, dynamic values, spreads and bypass paths; prove UI-package internals and approved exceptions pass. Check actual package recognition and lint execution in CI with pinned resolved versions.
- Build a separate minimal consumer from the published or packed artifact, including production CSS, SSR and direct URL loading. Check keyboard and screen-reader behavior, focus, responsive sizes, reduced motion, dark theme and visual regressions. Verify product workflows and private authorization according to repository instructions. Lint and builds alone do not establish visual or behavioral parity.
- Migrate incrementally, turn enforcement from baseline reporting to errors as directories become compliant, and run the repository's format, lint and build checks. No tests or builds were run for this research-only document.

## Open decisions

- Package ownership, registry visibility, release cadence, compatibility and consumer upgrade policy.
- Compiled CSS versus consumer compilation; theme ownership, Preflight, font loading and multiple-product branding.
- Exact product scope, whether any layout classes or integration exceptions are allowed, and how exceptions expire.
- Which product patterns are truly reusable, how much API flexibility is appropriate, and how to handle third-party components requiring styling props.
- Whether shadcn/lint recognizes the eventual packaged components reliably enough to supplement the custom boundary rule. Test before adoption.
