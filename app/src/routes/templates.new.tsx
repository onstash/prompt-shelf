import { createFileRoute } from "@tanstack/react-router";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/new")({ component: NewTemplateRoute });

function NewTemplateRoute() {
  return <ShelfScreen startCreating />;
}
