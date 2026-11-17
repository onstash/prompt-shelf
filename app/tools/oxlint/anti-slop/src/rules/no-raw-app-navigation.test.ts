import { RuleTester } from "oxlint/plugins-dev";

import { noRawAppNavigationRule } from "./no-raw-app-navigation.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });
const anchor = { messageId: "anchorLink" };
const call = { messageId: "locationCall" };
const assignment = { messageId: "locationAssign" };

tester.run("anti-slop/no-raw-app-navigation", noRawAppNavigationRule, {
  valid: [
    'const view = <Link to="/templates/new">New</Link>;',
    'const view = <a href="https://example.com">Docs</a>;',
    'const view = <a href="/api/auth/signout">Sign out</a>;',
    "const view = <a href={url}>Open</a>;",
    "window.location.assign(result.url);",
    "window.location.replace(`/api/auth/oauth2/authorize${search}`);",
    'window.location.href = "https://example.com";',
    "const search = window.location.search;",
  ],
  invalid: [
    { code: 'const view = <a href="/templates/new">New</a>;', errors: [anchor] },
    { code: "const view = <a href={`/templates/${id}`}>Open</a>;", errors: [anchor] },
    { code: 'window.location.assign("/templates/new");', errors: [call] },
    { code: "window.location.replace(`/login${search}`);", errors: [call] },
    { code: 'window.location.href = "/login";', errors: [assignment] },
  ],
});
