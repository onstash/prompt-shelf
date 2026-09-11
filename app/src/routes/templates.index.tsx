import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/templates/")({ component: TemplatesRoute });

function TemplatesRoute() {
  return <App initialScreen="templates" />;
}
