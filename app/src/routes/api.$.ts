import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import api from "@/server/api";

const handle = ({ request }: { request: Request }) => api.fetch(request, env);

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
    },
  },
});
