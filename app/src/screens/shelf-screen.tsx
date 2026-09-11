import { useQuery } from "@tanstack/react-query";
import { AuthScreen } from "@/screens/auth-screen";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { TemplateScreen } from "@/screens/template-screen";

type Props = {
  initialTemplateId?: string;
  startCreating?: boolean;
};

export function ShelfScreen({ initialTemplateId, startCreating = false }: Props) {
  const session = authClient.useSession();
  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: api.listTemplates,
    enabled: Boolean(session.data),
  });

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
        <PublicPageHeader />
        <AuthScreen />
      </PageContainer>
    );
  }

  if (templatesQuery.isPending) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-7xl px-5 py-20 text-muted-foreground">
          Loading Prompt Shelf…
        </main>
      </PageContainer>
    );
  }

  if (templatesQuery.isError) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-7xl px-5 py-20">
          <h1 className="text-2xl font-semibold">Could not load Prompt Shelf</h1>
          <p className="mt-2 text-muted-foreground">Try refreshing this page.</p>
        </main>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TemplateScreen
        templates={templatesQuery.data}
        startCreating={startCreating}
        initialTemplateId={initialTemplateId}
      />
    </PageContainer>
  );
}
