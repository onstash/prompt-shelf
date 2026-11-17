import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { env } from "cloudflare:workers";
import { getDb } from "./database";

// `execute` covers rendering and proposing edits. Proposals stay pending until approved in the browser.
export const mcpScopes = ["prompt-shelf.search", "prompt-shelf.execute", "offline_access"] as const;

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_WEEK_SECONDS = 7 * 24 * ONE_HOUR_SECONDS;

// One Better Auth instance per origin. Building it is expensive: it introspects the database schema.
const authByOrigin = new Map<string, ReturnType<typeof buildAuth>>();

export function createAuth(requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  const existing = authByOrigin.get(origin);
  if (existing) return existing;
  const auth = buildAuth(origin);
  authByOrigin.set(origin, auth);
  return auth;
}

function buildAuth(origin: string) {
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
        loginPage: "/login",
        consentPage: "/consent",
        scopes: [...mcpScopes],
        // Unauthenticated DCR is required for clients such as ChatGPT (ADR-0009).
        // The consent screen still requires a signed-in user before any access.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        // Access tokens last one hour. Refresh tokens last one week, so a connected app works for a week.
        accessTokenExpiresIn: ONE_HOUR_SECONDS,
        refreshTokenExpiresIn: ONE_WEEK_SECONDS,
      }),
    ],
  });
}
