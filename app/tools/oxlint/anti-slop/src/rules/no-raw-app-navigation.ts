import { defineRule } from "@oxlint/plugins";

/** Internal app paths start with a single "/". Protocol-relative URLs and API routes are not app routes. */
function isAppPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/api/");
}

function literalValue(node: {
  type: string;
  value?: unknown;
  quasis?: Array<{ value: { cooked: string | null } }>;
}): string | null {
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.quasis?.[0]) return node.quasis[0].value.cooked;
  return null;
}

/** Ban raw browser navigation to internal app routes. Use TanStack Router links and redirects instead. */
export const noRawAppNavigationRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow raw <a href> links and window.location navigation to internal app routes. Use TanStack Router.",
    },
    messages: {
      anchorLink:
        "Use TanStack Router's <Link> for app routes instead of a raw <a href>. Raw links reload the page and skip router state.",
      locationCall:
        "Use TanStack Router (navigate, or redirect in beforeLoad) for app routes instead of window.location.{{method}}.",
      locationAssign:
        "Use TanStack Router (navigate, or redirect in beforeLoad) for app routes instead of assigning window.location.",
    },
  },
  createOnce(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "a") return;
        for (const attribute of node.attributes) {
          if (attribute.type !== "JSXAttribute" || attribute.name.name !== "href") continue;
          const value = attribute.value;
          if (!value) continue;
          const expression = value.type === "JSXExpressionContainer" ? value.expression : value;
          const href = literalValue(expression);
          if (href !== null && isAppPath(href)) {
            context.report({ node: attribute, messageId: "anchorLink" });
          }
        }
      },
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;
        const method = node.callee.property;
        if (method.type !== "Identifier" || !["assign", "replace"].includes(method.name)) return;
        const location = node.callee.object;
        if (location.type !== "MemberExpression" || location.property.type !== "Identifier") return;
        if (location.property.name !== "location") return;
        const first = node.arguments[0];
        const target = first ? literalValue(first) : null;
        if (target !== null && isAppPath(target)) {
          context.report({ node, messageId: "locationCall", data: { method: method.name } });
        }
      },
      AssignmentExpression(node) {
        const left = node.left;
        if (left.type !== "MemberExpression" || left.property.type !== "Identifier") return;
        if (left.property.name !== "href") return;
        const location = left.object;
        if (location.type !== "MemberExpression" || location.property.type !== "Identifier") return;
        if (location.property.name !== "location") return;
        const target = literalValue(node.right);
        if (target !== null && isAppPath(target)) {
          context.report({ node, messageId: "locationAssign" });
        }
      },
    };
  },
});
