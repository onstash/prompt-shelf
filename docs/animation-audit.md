# Animation Audit

## Scope

- Application: `app/src`
- Stack: React 19, Base UI, owned shadcn primitives, Tailwind CSS 4, `tw-animate-css`, and Sonner
- Motion implementation: CSS; no dedicated JavaScript motion library
- Product character: calm productivity workspace requiring restrained, functional motion
- Audited commit: `43ab29a`

## Findings

| Priority | Severity | Category | Location | Current behavior | Recommended behavior | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | High | Physicality | `app/src/components/ui/sheet.tsx` | Sheets begin only 40px from their final position | Side sheets should enter from `translateX(±100%)`; top and bottom sheets should enter from `translateY(±100%)`. Retain opacity and `250ms cubic-bezier(0.32, 0.72, 0, 1)` | A drawer should originate beyond its own edge. The current short movement causes most of the panel to materialize without a clear spatial origin. |
| 2 | Medium | Accessibility | `app/src/index.css` | Reduced motion forces every transition and animation to `0.01ms` and one iteration | Remove positional movement while retaining purposeful opacity and color transitions lasting 120–200ms | Reduced motion should be gentler, not eliminate all state feedback. The global override prevents component-specific behavior. |
| 3 | Medium | Feedback | `app/src/components/ui/button.tsx`, `app/src/components/ui/select.tsx` | Buttons with `aria-haspopup` are excluded from press feedback, and Select triggers have no press response | Apply `scale(0.98)` with `transform 150ms cubic-bezier(0.23, 1, 0.32, 1)`. Disable transforms under reduced motion | Sheet, dialog, and Select triggers should acknowledge presses immediately. The resulting popup animation is not trigger feedback. |
| 4 | Low | Performance | `app/src/components/ui/badge.tsx` | Every Badge uses `transition-all` despite current badges being static | Remove the transition, or restrict interactive variants to background, border, and color transitions over 150ms | `transition-all` can animate unintended layout and paint properties without providing value. |
| 5 | Low | Cohesion | Shared UI primitives | Easing curves and timings are repeated inline, while some primitives use built-in easing | Define shared `--ease-out`, `--ease-in-out`, and `--ease-drawer` tokens and use explicit primitive durations | A shared motion vocabulary prevents drift as the component set grows. |

## Missed opportunities

| Priority | Location | Current behavior | Recommended motion | Purpose |
| --- | --- | --- | --- | --- |
| 1 | `app/src/components/template-field-editor.tsx` | Completing a `{{variable}}` instantly replaces the empty state or adds a field card | Enter new cards from `opacity: 0; transform: translateY(4px)` over `180ms cubic-bezier(0.23, 1, 0.32, 1)`. Do not stagger fields created from pasted content | Explain the relationship between a completed prompt variable and its generated field |
| 2 | `app/src/components/template-version-history.tsx` | Selecting another version instantly replaces inspected content | Key the inspector by version and crossfade opacity over `140ms cubic-bezier(0.23, 1, 0.32, 1)` | Make an occasional state replacement legible without moving text being compared |
| 3 | `app/src/screens/welcome-screen.tsx` | First-run workflow steps appear simultaneously | On new-user visits only, enter from `opacity: 0; translateY(6px)` over `240ms cubic-bezier(0.23, 1, 0.32, 1)` with a 40ms stagger | Use a small delight budget for a rare explanatory moment |

## Rejected candidates

- **Copy/Copied button content:** existing button state and toast already provide sufficient feedback.
- **Active-template navigation:** core navigation occurs too frequently for movement.
- **Live prompt values:** this is functional text updated frequently while users are reading it.
- **Tooltip behavior:** the Tooltip primitive currently has no consumers, so changing it has no product leverage.
- **Alert-dialog bounce or springs:** destructive confirmation should remain calm and centered.

## Accessibility requirements

- Under `prefers-reduced-motion`, remove transform-based movement and retain short opacity or color transitions that communicate state.
- Do not animate keyboard-initiated navigation.
- Gate future hover transforms behind `@media (hover: hover) and (pointer: fine)`.
- Prefer transform and opacity over layout-triggering animated properties.

## Verdict

The application does not need substantially more motion. The highest-leverage correction is making Sheets travel from their actual edge. The highest-leverage additive improvement is the automatic field-card entrance because it explains a product behavior rather than decorating it.
