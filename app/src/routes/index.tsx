import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { homeStructuredData, publicPageHead } from "@/lib/seo";
import { WelcomeScreen } from "@/screens/welcome-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    ...publicPageHead({
      title: "Prompt Shelf — Reusable AI Prompt Templates with Variables",
      description:
        "Create reusable AI prompt templates with typed variables. Fill a structured form, preview the compiled prompt, then copy it into any AI tool.",
      path: "/",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(homeStructuredData),
      },
    ],
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
