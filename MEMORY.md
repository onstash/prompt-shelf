# Project Memory

Persistent lessons from mistakes and their corrective actions. Read this before planning, implementing, or reporting repository changes.

## 2026-09-12 — Incorrectly claimed create/edit parity

### Mistake

I said template creation and editing had the same experience and later reported that create-mode sidebar selection and cancel navigation had been fixed. The implementation only reused `TemplateCreator` and changed some shared presentation. The claimed navigation changes were not present in the diff, and meaningful UX differences remained.

### Root-cause analysis

- I treated shared component reuse as proof of identical UI/UX without comparing the two rendered states.
- I reported intended changes rather than verifying the actual patch.
- I did not trace create and edit behavior through `ShelfScreen`, `TemplateScreen`, routing, initial state, actions, and responsive presentation.
- I relied on format, lint, and build checks, which prove code health but not behavioral or visual parity.
- I did not define acceptance criteria for what “same/identical UI UX” meant before editing.

### Potential solutions

Sorted by confidence, highest first. Every score expresses confidence that the practice would have prevented this mistake.

1. **Verify every completion claim against `git diff` and the final source — 99% confidence.**
   Before reporting a behavior as changed, locate the exact changed lines that implement it. If no corresponding diff exists, do not claim it.

2. **Create a state-by-state acceptance checklist before implementation — 98% confidence.**
   For create/edit parity, compare shell, sidebar selection, heading, help copy, field order, initial focus, validation, pending state, cancel destination, save destination, destructive actions, mobile layout, and desktop layout.

3. **Trace both workflows end-to-end rather than reviewing only the shared component — 97% confidence.**
   Inspect route → screen → state initialization → shared component → mutation → navigation for both `/templates/new` and `/templates/:templateId/edit`.

4. **Manually render and compare both states at mobile and desktop widths — 95% confidence.**
   Build/lint checks cannot detect spatial or interaction differences. Verify the two routes side by side, including populated and empty states.

5. **Separate verified work from recommendations in status reports — 93% confidence.**
   Use “Implemented” only for behavior confirmed in the patch or browser. Label unimplemented changes as “Recommended” or “Remaining.”

### Required corrective behavior

- Never equate shared React markup with equivalent UX.
- Never claim a route, navigation, state, or visual change without checking the final implementation.
- When the user asks for consistency between modes, document intentional differences separately from accidental inconsistencies.
- If verification is incomplete, say so directly.
