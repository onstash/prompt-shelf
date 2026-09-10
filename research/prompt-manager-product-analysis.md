# Prompt Manager: Product Brief

## Summary

The problem is valid: frequent AI users keep useful prompts across chats, notes, and bookmarks, then repeatedly rewrite them.

However, **storage and versioning alone are not differentiated**. ChatGPT Projects and GPTs already package reusable context and instructions, while developer tools such as LangSmith and PromptLayer provide prompt registries and versions.[1][2][4][5]

The stronger product is:

> **A simple, general-purpose library for saving, configuring, reusing, and improving AI workflows.**

Your health-content workflows are valuable dogfooding cases, not the target market.

## User and problem

### Primary user

A non-technical person who frequently uses ChatGPT, Claude, Gemini, or similar tools for writing, research, learning, planning, analysis, or operations.

### Core job

> Help me reuse what worked without searching old conversations or rebuilding prompts from scratch.

### Main pain points

- Prompts are scattered and difficult to retrieve.
- Stable instructions and task-specific inputs are mixed together.
- Users cannot easily reproduce good results.
- Editing destroys previous working versions.
- Templates rarely explain when or how to use them.

## Product concept

The durable unit should be a **Recipe**, not just prompt text:

- title and purpose;
- prompt instructions;
- configurable variables such as `{{topic}}`;
- optional example and output checklist;
- version history;
- target AI tool/model;
- usage and outcome notes.

Core lifecycle:

**Capture → Configure → Use → Evaluate → Improve**

## MVP

### Build

- Create, edit, duplicate, archive, favorite, and search recipes.
- Detect variables and generate a simple input form.
- Preview and copy the compiled prompt.
- Open the user’s preferred AI tool after copying.
- Autosave edits and create named checkpoints.
- Restore an old checkpoint as a new version.
- Record `Worked` or `Needs work` with an optional note.
- Export recipes as Markdown and JSON.
- Provide a small universal starter set.

### Starter recipes

1. Summarize and extract actions.
2. Research a topic with sources.
3. Analyze and improve writing.
4. Brainstorm and evaluate options.
5. Turn notes into a structured deliverable.
6. Explain a difficult concept.
7. Plan a project or decision.

Optional packs—Content, Research, Learning, Career, Sales, and Personal—can demonstrate breadth without adding domain-specific product logic.

### Defer

- Built-in AI execution
- Browser extensions
- Multi-step agents
- Collaboration and permissions
- Public marketplace and monetization
- Analytics and A/B testing
- Semantic search/RAG
- Native mobile apps

## Minimal UX

Required screens:

1. Recipe library
2. Recipe detail and input form
3. Recipe editor
4. Version history sheet
5. Settings and export

Design principles:

- One primary action per view.
- Clear typography and restrained visual hierarchy.
- Common actions remain visible.
- Progressive disclosure for advanced fields.
- Keyboard-friendly interactions.
- Small, purposeful motion with reduced-motion support.[9]

Suggested motion:

- button press: `scale(0.98)`, 80–120 ms;
- sheet entrance: 8–12 px movement, 220–300 ms;
- copy confirmation: icon transition without layout shift;
- list changes: subtle opacity and 4–8 px movement.

## Critique and risks

### Strengths

- Frequent and easy-to-dogfood problem.
- Applicable across many user segments.
- Templates and improvements can compound in value.
- Version history protects successful workflows.

### Risks

1. **Too similar to Notion or saved chats**  
   The configure-and-copy flow must be significantly faster than editing a note.

2. **Versioning may feel technical**  
   Use “checkpoint,” “what changed,” and “restore,” not Git terminology.

3. **Horizontal positioning may become unfocused**  
   Narrow the MVP by capability, not industry. Keep one universal recipe lifecycle.

4. **Templates may become a prompt graveyard**  
   Optimize for repeat use, not the number of saved templates.

5. **Model behavior changes**  
   Optionally record the AI tool, model, and date. Do not promise deterministic results.

6. **Marketplace quality is difficult**  
   Delay sharing and monetization until personal reuse is validated.

7. **High-stakes domains need safeguards**  
   Research and health packs should support sources, limitations, and manual verification. NIH and WHO guidance reinforces provenance, transparency, safety, and accountability.[7][8]

## Validation

Test a thin prototype with 5–10 frequent AI users.

| Assumption | Test | Success signal |
|---|---|---|
| Users reuse recipes | Track real use for two weeks | At least 3 recipes reused per active user |
| Variables save effort | Compare against editing stored prompt text | Faster completion and fewer missed inputs |
| Version history matters | Observe recipe revisions | Users restore or compare checkpoints |
| Users leave their AI tool to use this | Test copy/open flow | Users return for a second session unaided |

Primary metrics:

- recipes used per active user per week;
- percentage reused within 14 days;
- time from opening to copying;
- percentage of runs rated `Worked`;
- four-week retention.

Avoid optimizing for signups, template count, or time spent.

## Positioning

Recommended:

> **Save your best AI workflows. Reuse them without starting over.**

Avoid:

- “GitHub for prompts”—too technical;
- “ultimate prompt marketplace”—crowded and low-trust;
- domain-specific positioning—the product is for general users.

## Recommendation

Proceed with a general personal prompt-workflow manager centered on:

**save → fill inputs → copy → improve**

The decisive question is:

> Will users return because a recipe completes recurring work faster and more reliably than a saved note or old AI conversation?

If yes, add sharing, remixing, integrations, and collaboration later. If not, additional features will only produce a better-organized prompt graveyard.

## Sources

1. [OpenAI: Projects in ChatGPT](https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt)
2. [OpenAI: Creating a GPT](https://help.openai.com/en/articles/8554397-creating-a-gpt)
3. [OpenAI: Prompt engineering](https://platform.openai.com/docs/guides/prompt-engineering)
4. [LangSmith: Prompt engineering concepts](https://docs.langchain.com/langsmith/prompt-engineering-concepts)
5. [PromptLayer: Prompt Registry](https://docs.promptlayer.com/features/prompt-registry)
6. [Anthropic: Prompt engineering overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
7. [NIH/NCCIH: Evaluating online resources](https://www.nccih.nih.gov/health/know-science/finding-and-evaluating-online-resources)
8. [WHO: Ethics and governance of AI for health](https://www.who.int/publications/i/item/9789240029200)
9. [Apple HIG: Accessibility and motion](https://developer.apple.com/design/human-interface-guidelines/accessibility#Motion)
