import { defineRule } from "@oxlint/plugins";

/** D1 methods that must go through the timed Db wrapper. `exec` is excluded because RegExp also has it. */
const D1_METHODS = new Set(["prepare", "batch", "withSession", "dump"]);

/** Only the wrapper and the binding reader may touch D1 directly. Tests may use fixture databases. */
const ALLOWED_FILES = /(^|\/)src\/server\/(db|database)\.ts$/;
const TEST_FILES = /\.test\.tsx?$/;

type NamedMember = { computed: boolean; property: { type: string; name?: string; value?: unknown } };

function memberName(node: NamedMember): string | null {
  if (!node.computed && node.property.type === "Identifier") return node.property.name ?? null;
  if (node.computed && node.property.type === "Literal" && typeof node.property.value === "string")
    return node.property.value;
  return null;
}

/** Ban direct D1 calls and raw `DB` binding reads outside the timed wrapper. */
export const noDirectD1AccessRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct D1 calls and raw DB binding reads outside the timed Db wrapper in src/server/db.ts.",
    },
    messages: {
      directD1Call:
        "Call D1 through the Db wrapper (src/server/db.ts) so the query is timed and logged. Do not call `{{method}}` on a raw D1 database.",
      directBinding:
        "Read the database through getDb() (src/server/database.ts), not the raw `DB` binding.",
    },
  },
  createOnce(context) {
    let exempt = false;
    return {
      Program() {
        const path = context.filename.replaceAll("\\", "/");
        exempt = ALLOWED_FILES.test(path) || TEST_FILES.test(path);
      },
      CallExpression(node) {
        if (exempt || node.callee.type !== "MemberExpression") return;
        const method = memberName(node.callee);
        if (method !== null && D1_METHODS.has(method)) {
          context.report({ node, messageId: "directD1Call", data: { method } });
        }
      },
      MemberExpression(node) {
        if (!exempt && memberName(node) === "DB") {
          context.report({ node, messageId: "directBinding" });
        }
      },
    };
  },
});
