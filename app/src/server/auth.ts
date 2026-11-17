import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { env } from "cloudflare:workers";
import { getDb } from "./database";

export const mcpScopes = [
  "prompt-shelf.search",
  "prompt-shelf.execute",
  "prompt-shelf.propose",
  "offline_access",
] as const;

export function createAuth(requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  return betterAuth({
    // Better Auth reads and writes through the timed Db wrapper.
    database: getDb(),
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: ["http://localhost:5173", env.FRONTEND_URL].filter((value): value is string =>
      Boolean(value),
    ),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      jwt(),
      mcp({
        resource: `${origin}/mcp`,
        loginPage: "/sign-in",
        consentPage: "/consent",
        scopes: [...mcpScopes],
        // Unauthenticated DCR is required for clients such as ChatGPT (ADR-0009).
        // The consent screen still requires a signed-in user before any access.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
      }),
    ],
  });
}
