import { createFileRoute, notFound } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/examples/$exampleId")({
  beforeLoad: ({ params }) => {
    if (params.exampleId !== "clear-first-draft") throw notFound();
  },
  component: ExampleRoute,
});

function ExampleRoute() {
  return <App initialScreen="example" />;
}
