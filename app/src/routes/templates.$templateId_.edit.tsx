import { createFileRoute } from "@tanstack/react-router";
import { privatePageHead } from "@/lib/seo";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/$templateId_/edit")({
  head: () => privatePageHead("Edit Template | Prompt Shelf"),
  component: EditTemplateRoute,
});

function EditTemplateRoute() {
  const { templateId } = Route.useParams();
  return <ShelfScreen initialTemplateId={templateId} mode="edit" />;
}
