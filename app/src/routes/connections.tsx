import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/containers/page-container";
import { ShelfLayout } from "@/components/shelf-layout";
import { api } from "@/lib/api";
import { getSessionStatus } from "@/lib/auth.functions";
import { SCOPE_DESCRIPTIONS } from "@/lib/oauth-query";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/connections")({
  head: () => privatePageHead("Connected apps | Prompt Shelf"),
  beforeLoad: async () => {
    const session = await getSessionStatus();
    if (session.status === "signed-out") throw redirect({ to: "/login" });
  },
  component: ConnectionsRoute,
});

function ConnectionsRoute() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const connections = useQuery({ queryKey: ["connections"], queryFn: api.listConnections });
  const revoke = useMutation({
    mutationFn: (consentId: string) => api.revokeConnection(consentId),
    onSuccess: async () => {
      setMessage("Access revoked.");
      await queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: () => setMessage("Could not revoke this connection. Try again."),
  });

  return (
    <PageContainer>
      <ShelfLayout>
        <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
          <h1 className="text-2xl font-semibold">Connected apps</h1>
          <p className="text-muted-foreground">
            AI apps you have allowed to use Prompt Shelf. Revoking an app ends its access right
            away.
          </p>
          {message ? <p className="text-sm">{message}</p> : null}
          {connections.isPending ? <p className="text-muted-foreground">Loading…</p> : null}
          {connections.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Could not load connected apps.
            </p>
          ) : null}
          {connections.data?.connections.length === 0 ? (
            <p className="text-muted-foreground">No apps are connected.</p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {connections.data?.connections.map((connection) => (
              <li key={connection.consentId} className="flex flex-col gap-3 rounded-md border p-4">
                <div>
                  <p className="font-medium">{connection.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    Connected {new Date(connection.connectedAt).toLocaleDateString()}
                  </p>
                </div>
                <ul className="list-disc pl-5 text-sm">
                  {connection.scopes.map((scope) => (
                    <li key={scope}>{SCOPE_DESCRIPTIONS[scope] ?? scope}</li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  aria-label={`Revoke access for ${connection.clientName}`}
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(connection.consentId)}
                >
                  Revoke access
                </Button>
              </li>
            ))}
          </ul>
        </main>
      </ShelfLayout>
    </PageContainer>
  );
}
