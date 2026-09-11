import { createFileRoute } from "@tanstack/react-router";
import { ShelfScreen } from "@/screens/shelf-screen";

export const Route = createFileRoute("/templates/")({ component: TemplatesRoute });

function TemplatesRoute() {
  return <ShelfScreen />;
}
