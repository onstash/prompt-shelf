import { RuleTester } from "oxlint/plugins-dev";

import { noDirectD1AccessRule } from "./no-direct-d1-access.ts";

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });
const call = { messageId: "directD1Call" };
const binding = { messageId: "directBinding" };

tester.run("anti-slop/no-direct-d1-access", noDirectD1AccessRule, {
  valid: [
    { filename: "src/server/db.ts", code: "const statement = database.prepare(sql);" },
    { filename: "src/server/database.ts", code: "export const db = env.DB;" },
    { filename: "src/server/template-repository.test.ts", code: "sqlite.prepare(sql).run();" },
    { filename: "src/lib/compile-prompt.ts", code: "while ((match = token.exec(body))) {}" },
    { filename: "src/server/run-api.ts", code: "const name = config.database;" },
  ],
  invalid: [
    {
      filename: "src/server/template-repository.ts",
      code: "db.prepare(sql).bind(id).first();",
      errors: [call],
    },
    {
      filename: "src/server/template-repository.ts",
      code: "env.DB.prepare(sql).run();",
      errors: [call, binding],
    },
    {
      filename: "src/routes/api.$.ts",
      code: "await db.batch([statement]);",
      errors: [call],
    },
    {
      filename: "src/server/auth.ts",
      code: "const database = env['DB'];",
      errors: [binding],
    },
    {
      filename: "src/server/run-repository.ts",
      code: "db.withSession().prepare(sql);",
      errors: [call, call],
    },
  ],
});
