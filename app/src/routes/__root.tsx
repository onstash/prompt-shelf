import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import "@/index.css";

export const Route = createRootRouteWithContext<{
  queryClient: import("@tanstack/react-query").QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#f8f8f6" },
      {
        name: "description",
        content:
          "Create reusable AI prompt templates with variables, customize them, and copy the finished prompt into any AI tool.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Prompt Shelf" },
      { property: "og:title", content: "Prompt Shelf — Reusable AI prompt workflows" },
      {
        property: "og:description",
        content:
          "Turn repeatable thinking into reusable prompt templates that work with any AI tool.",
      },
      { name: "twitter:card", content: "summary" },
      { title: "Prompt Shelf — Reusable AI prompt workflows" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster position="bottom-center" />
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
