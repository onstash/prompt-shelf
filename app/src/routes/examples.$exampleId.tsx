import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { ExampleScreen } from "@/screens/example-screen";

export const Route = createFileRoute("/examples/$exampleId")({
  beforeLoad: ({ params }) => {
    if (params.exampleId !== "clear-first-draft") throw notFound();
  },
  component: ExampleRoute,
});

function ExampleRoute() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PublicPageHeader />
      <ExampleScreen
        onBack={() => void navigate({ to: "/" })}
        onUseExample={() => void navigate({ to: "/templates/new" })}
      />
    </PageContainer>
  );
}
