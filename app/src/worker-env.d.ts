import type { AppBindings } from "@/server/auth";

declare global {
  namespace Cloudflare {
    interface Env extends AppBindings {}
  }
}

export {};
