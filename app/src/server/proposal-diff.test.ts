import assert from "node:assert/strict";
import test from "node:test";
import { diffLines, diffProposal, tokensIn } from "./proposal-diff.ts";
import type { TemplateInput } from "./template-repository.ts";

const base: TemplateInput = {
  title: "Draft",
  description: "",
  category: "General",
  body: "Write for {{audience}}.\nKeep it {{length}}.",
  fields: [
    { key: "audience", label: "Audience", type: "text", required: true },
    { key: "length", label: "Length", type: "select", options: ["short", "long"] },
  ],
};

test("line diff marks added and removed lines", () => {
  assert.deepEqual(diffLines("a\nb\nc", "a\nx\nc"), [
    { kind: "same", text: "a" },
    { kind: "removed", text: "b" },
    { kind: "added", text: "x" },
    { kind: "same", text: "c" },
  ]);
});

test("tokens are read from the body", () => {
  assert.deepEqual([...tokensIn("Hi {{name}} and {{tone_1}}")].sort(), ["name", "tone_1"]);
});

test("reports added and removed tokens", () => {
  const diff = diffProposal(base, { ...base, body: "Write for {{reader}}.\nKeep it {{length}}." });

  assert.deepEqual(diff.addedTokens, ["reader"]);
  assert.deepEqual(diff.removedTokens, ["audience"]);
});

test("removing a field is breaking", () => {
  const diff = diffProposal(base, { ...base, fields: [base.fields[0]!] });

  assert.equal(diff.breaking, true);
  assert.deepEqual(diff.fields, [{ key: "length", kind: "removed", breaking: true, details: [] }]);
});

test("changing a select's options is breaking", () => {
  const diff = diffProposal(base, {
    ...base,
    fields: [base.fields[0]!, { ...base.fields[1]!, options: ["short", "medium", "long"] }],
  });

  assert.equal(diff.breaking, true);
  assert.equal(diff.fields[0]?.kind, "changed");
});

test("a label change is not breaking", () => {
  const diff = diffProposal(base, {
    ...base,
    fields: [{ ...base.fields[0]!, label: "Who is it for?" }, base.fields[1]!],
  });

  assert.equal(diff.breaking, false);
  assert.deepEqual(diff.fields[0]?.details, ['label "Audience" -> "Who is it for?"']);
});

test("reports metadata changes", () => {
  const diff = diffProposal(base, { ...base, title: "Final", category: "Writing" });

  assert.deepEqual(diff.metadata, [
    { name: "title", from: "Draft", to: "Final" },
    { name: "category", from: "General", to: "Writing" },
  ]);
  assert.equal(diff.breaking, false);
});
