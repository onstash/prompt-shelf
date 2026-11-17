import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "@/server/auth";

// RFC 9728 protected resource metadata for the /mcp resource (served by the mcp() plugin).
const handle = ({ request }: { request: Request }) => createAuth(request.url).handler(request);

export const Route = createFileRoute("/.well-known/oauth-protected-resource/mcp")({
  server: { handlers: { GET: handle, HEAD: handle } },
});
