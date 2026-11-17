import { createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicHeader } from "@/components/public-header";
import { PageContainer } from "@/containers/page-container";
import { getSessionStatus } from "@/lib/auth.functions";
import { api } from "@/lib/api";
import { oauthQuery } from "@/lib/oauth-query";
import { privatePageHead } from "@/lib/seo";
import { AuthScreen } from "@/screens/auth-screen";
import { Alert } from "@/components/ui/alert";

export const Route = createFileRoute("/login")({
  head: () => privatePageHead("Sign in | Prompt Shelf"),
  beforeLoad: async () => {
    const session = await getSessionStatus();
    // Signed in and no AI connection to resume: nothing to do here.
    if (session.status === "signed-in" && !oauthQuery(session.search)) {
      throw redirect({ to: "/templates/new" });
    }
    return { session };
  },
  component: LoginRoute,
});

function LoginRoute() {
  const { session } = Route.useRouteContext();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  // Presence check for the view only. The signed query is forwarded from the raw browser URL.
  const hasRequest = oauthQuery(location.searchStr) !== null;

  // An AI client started a connection. Resume it now that the user is signed in.
  useEffect(() => {
    const signedQuery = oauthQuery(globalThis.location.search);
    if (session.status !== "signed-in" || !signedQuery) return;
    api
      .continueOAuth(signedQuery)
      .then(({ url }) => window.location.assign(url))
      .catch(() => setError("Unable to continue the connection."));
  }, [session.status]);

  if (session.status === "signed-in" && hasRequest) {
    return (
      <PageContainer>
        <main className="grid min-h-dvh place-items-center px-4">
          <section className="w-full max-w-sm py-16" aria-live="polite">
            <p className="text-muted-foreground">Continuing the connection…</p>
            {error ? (
              <Alert variant="destructive" className="mt-4">
                {error}
              </Alert>
            ) : null}
          </section>
        </main>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PublicHeader />
      <AuthScreen />
    </PageContainer>
  );
}
