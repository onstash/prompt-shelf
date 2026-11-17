// Commit types match AGENTS.md and release-please. `revert` is recognized by release-please.
// `style` is intentionally absent: AGENTS.md does not list it.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "perf", "refactor", "docs", "test", "build", "ci", "chore", "revert"],
    ],
  },
};
