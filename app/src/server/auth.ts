import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/d1";
import { authSchema } from "./auth-schema";

export type AppBindings = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  FRONTEND_URL?: string;
};

export function createAuth(bindings: AppBindings, requestUrl: string) {
  const origin = new URL(requestUrl).origin;
  return betterAuth({
    database: drizzleAdapter(drizzle(bindings.DB), {
      provider: "sqlite",
      schema: authSchema,
    }),
    baseURL: origin,
    secret: bindings.BETTER_AUTH_SECRET,
    trustedOrigins: ["http://localhost:5173", bindings.FRONTEND_URL].filter(
      (value): value is string => Boolean(value),
    ),
    socialProviders: {
      google: {
        clientId: bindings.GOOGLE_CLIENT_ID,
        clientSecret: bindings.GOOGLE_CLIENT_SECRET,
      },
    },
  });
}
