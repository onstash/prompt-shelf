import assert from "node:assert/strict";
import test from "node:test";
import { compilePrompt } from "./compile-prompt.ts";

test("compiles repeated and missing values deterministically", () => {
  const result = compilePrompt("Hello {{ name }}. {{name}} meets {{missing}}.", { name: "Sam" });
  assert.equal(result.text, "Hello Sam. Sam meets .");
  assert.deepEqual(
    result.segments.filter((segment) => segment.type === "value"),
    [
      { type: "value", key: "name", text: "Sam" },
      { type: "value", key: "name", text: "Sam" },
      { type: "value", key: "missing", text: "" },
    ],
  );
});
