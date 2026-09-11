import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/templates/new")({ component: NewTemplateRoute });

function NewTemplateRoute() {
  return <App initialScreen="create" />;
}
