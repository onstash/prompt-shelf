import { RuleTester } from "oxlint/plugins-dev";

import { noNormalizedOauthQueryRule } from "./no-normalized-oauth-query.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });
const forwarded = { messageId: "forwarded" };
const redirect = { messageId: "redirect" };

tester.run("anti-slop/no-normalized-oauth-query", noNormalizedOauthQueryRule, {
  valid: [
    "api.respondToConsent(accept, oauthQuery(globalThis.location.search));",
    "api.continueOAuth(signedQuery);",
    "const hasRequest = oauthQuery(location.searchStr) !== null;",
    'throw redirect({ href: `/login${session.search}` });',
    "const title = location.searchStr;",
  ],
  invalid: [
    { code: "api.respondToConsent(accept, oauthQuery(location.searchStr));", errors: [forwarded] },
    { code: "api.continueOAuth(location.searchStr.slice(1));", errors: [forwarded] },
    { code: "throw redirect({ href: `/login${location.searchStr}` });", errors: [redirect] },
  ],
});
