import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { publicPageHead } from "@/lib/seo";
import { ExampleScreen } from "@/screens/example-screen";

export const Route = createFileRoute("/examples/$exampleId")({
  beforeLoad: ({ params }) => {
    if (params.exampleId !== "clear-first-draft") throw notFound();
  },
  head: () =>
    publicPageHead({
      title: "Clear First Draft Prompt Template | Prompt Shelf",
      description:
        "Turn rough notes into a clear first draft with this reusable AI prompt template from Prompt Shelf.",
      path: "/examples/clear-first-draft",
    }),
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
