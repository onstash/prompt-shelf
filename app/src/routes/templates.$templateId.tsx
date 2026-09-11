import { createFileRoute } from "@tanstack/react-router";
import { privatePageHead } from "@/lib/seo";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/$templateId")({
  head: () => privatePageHead("Template | Prompt Shelf"),
  component: TemplateRoute,
});

function TemplateRoute() {
  const { templateId } = Route.useParams();
  return <ShelfScreen initialTemplateId={templateId} />;
}
