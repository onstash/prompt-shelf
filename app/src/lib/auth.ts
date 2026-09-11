import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_API_URL ??
    (import.meta.env.DEV ? "http://localhost:8787" : window.location.origin),
});
