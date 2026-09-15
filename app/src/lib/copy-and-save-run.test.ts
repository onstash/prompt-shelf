import assert from "node:assert/strict";
import test from "node:test";
import { copyAndSaveRun } from "./copy-and-save-run.ts";

test("creates one run after a successful clipboard write", async () => {
  const calls: string[] = [];
  const result = await copyAndSaveRun(
    "compiled prompt",
    async () => {
      calls.push("save");
    },
    async (text) => {
      calls.push(`copy:${text}`);
    },
  );

  assert.equal(result, "saved");
  assert.deepEqual(calls, ["copy:compiled prompt", "save"]);
});

test("does not create a run when the clipboard write fails", async () => {
  let saves = 0;
  const result = await copyAndSaveRun(
    "compiled prompt",
    async () => {
      saves += 1;
    },
    async () => {
      throw new Error("clipboard unavailable");
    },
  );

  assert.equal(result, "copy-failed");
  assert.equal(saves, 0);
});

test("reports a save failure after a successful clipboard write", async () => {
  const result = await copyAndSaveRun(
    "compiled prompt",
    async () => {
      throw new Error("network unavailable");
    },
    async () => undefined,
  );

  assert.equal(result, "save-failed");
});
