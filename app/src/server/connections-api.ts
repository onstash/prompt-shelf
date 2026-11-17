import { z } from "zod";
import { createAuth } from "./auth.ts";
import type { Db } from "./db.ts";

const revokeSchema = z.object({ consentId: z.string().min(1).max(100) }).strict();

function json(body: object, status = 200): Response {
  return Response.json(body, { status });
}

/**
 * Lists the AI apps a user has connected, and revokes one. Revoking deletes the consent and every
 * refresh and access token that client holds for this user, so access ends at once for stored tokens.
 */
export async function handleConnectionRequest(request: Request, db: Db): Promise<Response> {
  const session = await createAuth(request.url).api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Authentication required" }, 401);
  const userId = session.user.id;
  const segments = new URL(request.url).pathname.split("/").filter(Boolean);

  if (segments.length === 2 && request.method === "GET") {
    const result = await db
      .query(
        `SELECT co.id AS consentId, c.name AS clientName, co.scopes AS scopes, co.createdAt AS connectedAt
         FROM oauthConsent co JOIN oauthClient c ON c.clientId = co.clientId
         WHERE co.userId = ? ORDER BY co.createdAt DESC`,
      )
      .bind(userId)
      .all<{ consentId: string; clientName: string | null; scopes: string; connectedAt: string }>();
    return json({
      connections: result.results.map((row) => ({
        consentId: row.consentId,
        clientName: row.clientName ?? "Unnamed AI client",
        // SAFETY: the scopes column is written only from Better Auth's string array.
        scopes: JSON.parse(row.scopes) as string[],
        connectedAt: row.connectedAt,
      })),
    });
  }

  if (segments.length === 3 && segments[2] === "revoke" && request.method === "POST") {
    const parsed = revokeSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 422);
    const consent = await db
      .query("SELECT clientId FROM oauthConsent WHERE id = ? AND userId = ?")
      .bind(parsed.data.consentId, userId)
      .first<{ clientId: string }>();
    if (!consent) return json({ error: "Connection not found" }, 404);

    await db.transaction([
      db
        .query("DELETE FROM oauthAccessToken WHERE clientId = ? AND userId = ?")
        .bind(consent.clientId, userId),
      db
        .query("DELETE FROM oauthRefreshToken WHERE clientId = ? AND userId = ?")
        .bind(consent.clientId, userId),
      db
        .query("DELETE FROM oauthConsent WHERE id = ? AND userId = ?")
        .bind(parsed.data.consentId, userId),
    ]);
    return json({ revoked: true });
  }

  return new Response(null, { status: 405 });
}
