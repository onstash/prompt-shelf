import { useNavigate } from "@tanstack/react-router";
import { PublicHeader } from "@/components/public-header";
import { authClient } from "@/lib/auth";

export function PublicPageHeader() {
  const navigate = useNavigate();
  const session = authClient.useSession();

  return (
    <PublicHeader
      onCreateTemplate={() => void navigate({ to: "/templates/new" })}
      onOpenShelf={session.data ? () => void navigate({ to: "/templates" }) : undefined}
      onSignOut={
        session.data
          ? async () => {
              await authClient.signOut();
              await navigate({ to: "/" });
            }
          : undefined
      }
    />
  );
}
