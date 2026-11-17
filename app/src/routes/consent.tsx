import { createFileRoute, redirect, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/containers/page-container";
import { getSessionStatus } from "@/lib/auth.functions";
import { api } from "@/lib/api";
import { oauthQuery, SCOPE_DESCRIPTIONS } from "@/lib/oauth-query";
import { privatePageHead } from "@/lib/seo";
import { Alert } from "@/components/ui/alert";

export const Route = createFileRoute("/consent")({
  head: () => privatePageHead("Allow connection | Prompt Shelf"),
  beforeLoad: async () => {
    const session = await getSessionStatus();
    // Signed out: send the user to sign in with the signed query intact, so the request resumes.
    // Use the raw request query: router-normalized search can drop repeated signed parameters.
    if (session.status === "signed-out" && oauthQuery(session.search)) {
      throw redirect({ href: `/login${session.search}` });
    }
    return { session };
  },
  component: ConsentRoute,
});

function ConsentRoute() {
  const { session } = Route.useRouteContext();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Presence check only. The signed query itself is read from the raw browser URL on click.
  const hasRequest = oauthQuery(location.searchStr) !== null;
  const query = new URLSearchParams(location.searchStr);
  const clientName = query.get("client_name") ?? "This AI client";
  const requestedScopes = (query.get("scope") ?? "").split(" ").filter(Boolean);

  async function decide(accept: boolean) {
    const signedQuery = oauthQuery(globalThis.location.search);
    if (!signedQuery) {
      setError("This connection request is invalid or has expired.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.respondToConsent(accept, signedQuery);
      window.location.assign(result.url);
    } catch {
      setError("Unable to record your decision.");
      setSubmitting(false);
    }
  }

  if (!hasRequest) {
    return (
      <PageContainer>
        <main className="grid min-h-dvh place-items-center px-4">
          <section className="w-full max-w-sm py-16">
            <h1 className="text-2xl font-semibold">No connection request</h1>
            <p className="mt-2 text-muted-foreground">
              Start the connection from the AI app you want to link to Prompt Shelf.
            </p>
          </section>
        </main>
      </PageContainer>
    );
  }

  // beforeLoad has already redirected signed-out users; this narrows the type for the view.
  if (session.status === "signed-out") return null;

  return (
    <PageContainer>
      <main className="grid min-h-dvh place-items-center px-4">
        <section className="w-full max-w-sm py-16" aria-labelledby="consent-title">
          <p className="mb-3 text-xs font-semibold text-muted-foreground">Connection request</p>
          <h1 id="consent-title" className="text-3xl font-semibold tracking-tight">
            Allow {clientName}?
          </h1>
          <p className="my-6 text-muted-foreground">
            Signed in as {session.user.email}. This app will be able to:
          </p>
          <ul className="mb-6 list-disc pl-5 text-sm">
            {requestedScopes.map((scope) => (
              <li key={scope}>{SCOPE_DESCRIPTIONS[scope] ?? scope}</li>
            ))}
          </ul>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          ) : null}
          <div className="grid gap-3">
            <Button
              className="h-12"
              type="button"
              disabled={submitting}
              onClick={() => void decide(true)}
            >
              Allow connection
            </Button>
            <Button
              className="h-12"
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => void decide(false)}
            >
              Deny
            </Button>
          </div>
        </section>
      </main>
    </PageContainer>
  );
}
