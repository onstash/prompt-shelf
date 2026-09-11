import { createFileRoute } from "@tanstack/react-router";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/$templateId")({ component: TemplateRoute });

function TemplateRoute() {
  const { templateId } = Route.useParams();
  return <ShelfScreen initialTemplateId={templateId} />;
}
