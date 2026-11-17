import assert from "node:assert/strict";
import test from "node:test";
import { oauthQuery } from "./oauth-query.ts";

// A signed query with repeated `ba_param` keys and percent-encoded values, as Better Auth issues it.
const signed =
  "?client_id=abc&scope=prompt-shelf.search%20prompt-shelf.execute&ba_param=client_id&ba_param=code_challenge&ba_param=scope&exp=1794888151&sig=Zm9vYmFy";

test("returns the signed query byte-for-byte, without the leading question mark", () => {
  assert.equal(oauthQuery(signed), signed.slice(1));
});

test("keeps repeated keys and encoding unchanged", () => {
  const forwarded = oauthQuery(signed);

  assert.ok(forwarded?.includes("ba_param=client_id&ba_param=code_challenge&ba_param=scope"));
  assert.ok(forwarded?.includes("scope=prompt-shelf.search%20prompt-shelf.execute"));
});

test("a URLSearchParams round trip changes the bytes, which is why it must not be used", () => {
  const roundTripped = new URLSearchParams(signed).toString();

  assert.notEqual(roundTripped, signed.slice(1));
});

test("returns null when the URL carries no signature", () => {
  assert.equal(oauthQuery("?client_id=abc&scope=prompt-shelf.search"), null);
});
