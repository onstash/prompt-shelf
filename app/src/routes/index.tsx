import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/header";
import { PublicHeader } from "@/components/public-header";
import { TemplateWorkspace } from "@/components/template-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/containers/page-container";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
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
  const session = authClient.useSession();
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    enabled: Boolean(session.data),
  });
  const createTemplate = () => void navigate({ to: "/templates/new" });
  const openExample = () =>
    void navigate({
      to: "/examples/$exampleId",
      params: { exampleId: "clear-first-draft" },
    });
  const selectTemplate = (templateId: string) =>
    void navigate({ to: "/templates/$templateId", params: { templateId } });
  const signOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/" });
  };
  const welcome = (audience: "new" | "returning" = "new") => (
    <WelcomeScreen
      audience={audience}
      onCreate={createTemplate}
      onOpenShelf={() => void navigate({ to: "/templates" })}
      onExample={openExample}
    />
  );

  if (!session.data) {
    return (
      <PageContainer>
        <PublicHeader />
        {welcome()}
      </PageContainer>
    );
  }

  if (!templates.data) {
    return (
      <PageContainer>
        <Header
          templates={[]}
          selectedTemplateId=""
          onSelectTemplate={selectTemplate}
          onCreateTemplate={createTemplate}
          onSignOut={signOut}
        />
        <main className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-10" aria-busy="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full max-w-2xl" />
          <Skeleton className="h-16 w-full max-w-xl" />
          <Skeleton className="h-10 w-40" />
        </main>
      </PageContainer>
    );
  }

  const selectedTemplateId = templates.data[0]?.id ?? "";
  return (
    <PageContainer>
      <Header
        templates={templates.data}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={selectTemplate}
        onCreateTemplate={createTemplate}
        onSignOut={signOut}
      />
      <TemplateWorkspace
        templates={templates.data}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={selectTemplate}
        onCreateTemplate={createTemplate}
        onSignOut={signOut}
      >
        {welcome(templates.data.some((template) => !template.isExample) ? "returning" : "new")}
      </TemplateWorkspace>
    </PageContainer>
  );
}
