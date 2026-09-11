import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PublicPageHeader } from "@/components/public-page-header";
import { PageContainer } from "@/containers/page-container";
import { authClient } from "@/lib/auth";
import { AuthScreen } from "@/screens/auth-screen";

export const Route = createFileRoute("/sign-in")({ component: SignInRoute });

function SignInRoute() {
  const session = authClient.useSession();

  if (session.isPending) {
    return (
      <PageContainer>
        <main className="sr-only">Loading session…</main>
      </PageContainer>
    );
  }

  if (session.data) return <Navigate to="/templates/new" replace />;

  return (
    <PageContainer>
      <PublicPageHeader />
      <AuthScreen />
    </PageContainer>
  );
}
