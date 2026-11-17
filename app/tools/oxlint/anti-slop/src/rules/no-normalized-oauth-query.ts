import { defineRule } from "@oxlint/plugins";

/** Calls that forward a signed OAuth query to Better Auth. The query must be the raw browser string. */
const FORWARDING_CALLS = new Set(["respondToConsent", "continueOAuth"]);

/** Router-normalized search state. Forwarding it can drop repeated signed parameters such as `ba_param`. */
const NORMALIZED_SEARCH = /\.searchStr\b/;

/** Forbid forwarding router-normalized search state inside a signed OAuth request. */
export const noNormalizedOauthQueryRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow forwarding router-normalized search (`.searchStr`) as a signed OAuth query. Use the raw browser search.",
    },
    messages: {
      forwarded:
        "Forward the raw browser query (`globalThis.location.search`), not router-normalized `.searchStr`. Normalization can change signed OAuth parameters.",
      redirect:
        "Build OAuth redirects from the raw request search, not router-normalized `.searchStr`.",
    },
  },
  createOnce(context) {
    return {
      CallExpression(node) {
        const source = context.sourceCode;
        if (node.callee.type === "MemberExpression" && node.callee.property.type === "Identifier") {
          if (FORWARDING_CALLS.has(node.callee.property.name)) {
            for (const argument of node.arguments) {
              if (NORMALIZED_SEARCH.test(source.getText(argument))) {
                context.report({ node: argument, messageId: "forwarded" });
              }
            }
          }
          return;
        }
        if (node.callee.type === "Identifier" && node.callee.name === "redirect") {
          for (const argument of node.arguments) {
            if (NORMALIZED_SEARCH.test(source.getText(argument))) {
              context.report({ node: argument, messageId: "redirect" });
            }
          }
        }
      },
    };
  },
});
