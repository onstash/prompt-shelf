import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PublicHeader } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import { PageContainer } from "@/containers/page-container";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { AuthScreen } from "@/screens/auth-screen";
import { ExampleScreen } from "@/screens/example-screen";
import { TemplateScreen } from "@/screens/template-screen";
import { WelcomeScreen } from "@/screens/welcome-screen";
import "./index.css";

type Screen = "welcome" | "example" | "templates" | "create";

type Props = {
  initialScreen?: Screen;
  initialTemplateId?: string;
};

function App({ initialScreen: screen = "welcome", initialTemplateId }: Props) {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    enabled: Boolean(session.data),
  });

  const beginCreating = () => {
    void navigate({ to: "/templates/new" });
  };

  const publicHeader = (
    <PublicHeader
      onCreateTemplate={beginCreating}
      onOpenShelf={session.data ? () => void navigate({ to: "/templates" }) : undefined}
      onSignOut={session.data ? () => void authClient.signOut() : undefined}
    />
  );

  if (screen === "welcome") {
    return (
      <PageContainer>
        {publicHeader}
        <WelcomeScreen
          onCreate={beginCreating}
          onExample={() =>
            void navigate({
              to: "/examples/$exampleId",
              params: { exampleId: "clear-first-draft" },
            })
          }
        />
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  if (screen === "example") {
    return (
      <PageContainer>
        {publicHeader}
        <ExampleScreen onBack={() => void navigate({ to: "/" })} onUseExample={beginCreating} />
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  if (session.isPending) {
    return (
      <PageContainer>
        <main className="sr-only">Loading session…</main>
      </PageContainer>
    );
  }

  if (!session.data) {
    return (
      <PageContainer>
        {publicHeader}
        <AuthScreen />
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  if (templatesQuery.isPending) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-7xl px-5 py-20 text-muted-foreground">
          Loading Prompt Shelf…
        </main>
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  if (templatesQuery.isError) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-7xl px-5 py-20">
          <h1 className="text-2xl font-semibold">Could not load Prompt Shelf</h1>
          <p className="mt-2 text-muted-foreground">Start the local API, then refresh this page.</p>
        </main>
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TemplateScreen
        templates={templatesQuery.data}
        startCreating={screen === "create"}
        initialTemplateId={initialTemplateId}
      />
      <Toaster position="bottom-center" />
    </PageContainer>
  );
}

export default App;
