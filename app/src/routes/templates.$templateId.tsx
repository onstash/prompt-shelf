import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/templates/$templateId")({ component: TemplateRoute });

function TemplateRoute() {
  const { templateId } = Route.useParams();
  return <App initialScreen="templates" initialTemplateId={templateId} />;
}
