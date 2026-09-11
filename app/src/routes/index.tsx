import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { publicPageHead } from "@/lib/seo";
import { WelcomeScreen } from "@/screens/welcome-screen";

export const Route = createFileRoute("/")({
  head: () =>
    publicPageHead({
      title: "Prompt Shelf — Reusable AI Prompt Templates",
      description:
        "Create reusable AI prompt templates with variables, then fill them in and copy the finished prompt into any AI tool.",
      path: "/",
    }),
  component: HomeRoute,
});

function HomeRoute() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <PublicPageHeader />
      <WelcomeScreen
        onCreate={() => void navigate({ to: "/templates/new" })}
        onExample={() =>
          void navigate({
            to: "/examples/$exampleId",
            params: { exampleId: "clear-first-draft" },
          })
        }
      />
    </PageContainer>
  );
}
