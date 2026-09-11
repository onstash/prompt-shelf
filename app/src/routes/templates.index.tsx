import { createFileRoute } from "@tanstack/react-router";
import { privatePageHead } from "@/lib/seo";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/")({
  head: () => privatePageHead("My Shelf | Prompt Shelf"),
  component: TemplatesRoute,
});

function TemplatesRoute() {
  return <ShelfScreen />;
}
