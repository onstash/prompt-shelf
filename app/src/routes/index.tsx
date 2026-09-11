import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { WelcomeScreen } from "@/screens/welcome-screen";

export const Route = createFileRoute("/")({ component: HomeRoute });

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
