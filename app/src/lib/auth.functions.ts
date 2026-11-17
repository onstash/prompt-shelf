import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createAuth } from "@/server/auth";

export type SessionStatus =
  | { status: "signed-out" }
  | { status: "signed-in"; user: { email: string; name: string } };

/** Reads the signed-in user on the server, so routes can decide before rendering. */
export const getSessionStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionStatus> => {
    const request = getRequest();
    const session = await createAuth(request.url).api.getSession({ headers: request.headers });
    if (!session) return { status: "signed-out" };
    return { status: "signed-in", user: { email: session.user.email, name: session.user.name } };
  },
);
