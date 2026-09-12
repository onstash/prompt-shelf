import { createFileRoute } from "@tanstack/react-router";
import { privatePageHead } from "@/lib/seo";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/new")({
  head: () => privatePageHead("New Template | Prompt Shelf"),
  component: NewTemplateRoute,
});

function NewTemplateRoute() {
  return <ShelfScreen mode="create" />;
}
