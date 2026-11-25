import { defineConfig } from "oxlint";
export default defineConfig({
  overrides: [{ files: ["src/lib/utils.ts"], rules: { "no-restricted-imports": "off" } }],
  jsPlugins: [
    { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/src/index.ts" },
    "@shadcn/lint",
  ],
  rules: {
    "shadcn/no-restyle": "warn",
    "shadcn/no-raw-colors": "warn",
    "shadcn/no-arbitrary-values": "warn",
    "shadcn/no-inline-styles": "warn",
    "shadcn/no-unknown-classes": "warn",
    "shadcn/require-static-classes": "warn",
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "cn",
            message:
              'Import cn from "@/lib/utils". That module is the single boundary for class-name merging.',
          },
        ],
      },
    ],
    "anti-slop/no-array-filter-map": "error",
    "anti-slop/no-reduce-accumulator-copy": "error",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-direct-d1-access": "error",
    "anti-slop/no-raw-app-navigation": "error",
    "anti-slop/no-normalized-oauth-query": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
  },
});
