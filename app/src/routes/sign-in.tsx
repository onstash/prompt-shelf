import { createFileRoute, Navigate } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public-header";
import { PageContainer } from "@/containers/page-container";
import { authClient } from "@/lib/auth";
import { privatePageHead } from "@/lib/seo";
import { AuthScreen } from "@/screens/auth-screen";

export const Route = createFileRoute("/sign-in")({
  head: () => privatePageHead("Sign in | Prompt Shelf"),
  component: SignInRoute,
});

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
      <PublicHeader />
      <AuthScreen />
    </PageContainer>
  );
}
