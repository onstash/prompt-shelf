import assert from "node:assert/strict";
import test from "node:test";
import {
  canDecideProposals,
  PROPOSALS_PER_CLIENT_PER_HOUR,
  withinProposalLimit,
} from "./proposal-permissions.ts";

test("owners and admins can approve or reject proposals", () => {
  assert.equal(canDecideProposals("owner"), true);
  assert.equal(canDecideProposals("admin"), true);
});

test("members can propose but cannot decide", () => {
  assert.equal(canDecideProposals("member"), false);
  assert.equal(canDecideProposals(""), false);
});

test("allows proposals until the hourly limit is reached", () => {
  assert.equal(withinProposalLimit(PROPOSALS_PER_CLIENT_PER_HOUR - 1), true);
  assert.equal(withinProposalLimit(PROPOSALS_PER_CLIENT_PER_HOUR), false);
});
