import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "@/server/auth";

// RFC 8414 discovery for the issuer at /api/auth. The metadata is served under the issuer path.
const handle = ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  url.pathname = "/api/auth/.well-known/oauth-authorization-server";
  return createAuth(request.url).handler(new Request(url, request));
};

export const Route = createFileRoute("/.well-known/oauth-authorization-server/api/auth")({
  server: { handlers: { GET: handle } },
});
