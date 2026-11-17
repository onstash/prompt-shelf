import assert from "node:assert/strict";
import test from "node:test";
import { canDecideProposals } from "./proposal-permissions.ts";

test("owners and admins can approve or reject proposals", () => {
  assert.equal(canDecideProposals("owner"), true);
  assert.equal(canDecideProposals("admin"), true);
});

test("members can propose but cannot decide", () => {
  assert.equal(canDecideProposals("member"), false);
  assert.equal(canDecideProposals(""), false);
});
