# Animation Opportunities

Prompt Shelf is a frequently used productivity interface. Motion should remain restrained and exist only to explain state, provide feedback, or prevent jarring changes.

## Recommended opportunities

| Priority | Location | Current behavior | Purpose | Frequency | Recommended motion |
| --- | --- | --- | --- | --- | --- |
| 1 | `app/src/components/template-field-editor.tsx:16-38` | Completing or deleting a `{{variable}}` instantly swaps the empty state and field cards. | Preventing a jarring change | Occasional during template authoring | Give newly created field cards an entry transition using `@starting-style`: `opacity: 0; transform: translateY(4px)` to `opacity: 1; transform: translateY(0)` over `180ms cubic-bezier(0.23,1,0.32,1)`. Under reduced motion, retain a `120ms` opacity transition and remove translation. Do not stagger fields created from pasted content. |
| 2 | `app/src/components/template-version-history.tsx:44-82` | Selecting another revision instantly replaces its metadata, fields, and prompt body. | State indication | Occasional | Key the preview by version and crossfade only from `opacity: 0` to `1` over `140ms cubic-bezier(0.23,1,0.32,1)`. Avoid translation because users are comparing readable content. Reduced motion can retain the brief opacity transition. |
| 3 | `app/src/screens/welcome-screen.tsx:61-72` | The three first-run explanation steps appear simultaneously. | Explanation and delight | Rare / first-time | On the new-user page only, enter each step from `opacity: 0; transform: translateY(6px)` over `240ms cubic-bezier(0.23,1,0.32,1)`, staggered by `40ms`. Never delay interaction. Under reduced motion, use a simultaneous `160ms` opacity-only entrance. |

## Deliberately rejected candidates

| Location | Candidate | Reason for rejection |
| --- | --- | --- |
| `app/src/components/prompt-preview.tsx:55-58` | Animate the Copy icon and label change. | Feedback already comes from the immediate button state and Sonner toast. More animation would duplicate feedback on a frequent action. |
| `app/src/components/template-navigation.tsx:46-60` | Animate active-template navigation changes. | Core navigation happens frequently. Movement would make the shelf feel slower. |
| `app/src/components/prompt-preview.tsx:32-40` | Animate prompt segments whenever answers change. | This is high-frequency functional text that users are actively reading. Movement would hinder comprehension. |
| `app/src/components/ui/sheet.tsx:25-59` | Add more motion to navigation, Customize, or version-history Sheets. | Sheets already use spatially consistent 200–250ms transform and opacity transitions with an appropriate drawer curve. |
| `app/src/components/ui/alert-dialog.tsx:19-47` | Add spring or bounce to destructive confirmations. | Destructive decisions should feel calm and deliberate. The existing short fade and scale are sufficient. |

## Verdict

The interface is already close to the appropriate motion level. Automatic field creation is the highest-leverage opportunity because it visually explains the relationship between prompt variables and generated fields. Avoid broad page transitions, animated navigation, or movement in live prompt text.
