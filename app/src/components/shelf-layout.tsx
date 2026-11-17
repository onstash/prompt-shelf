import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { TemplateWorkspace } from "@/components/template-workspace";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth";

/** The signed-in app shell: header on every screen, with the shelf sidebar beside the page content. */
export function ShelfLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const templates = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });
  const list = templates.data ?? [];

  const selectTemplate = (templateId: string) =>
    void navigate({ to: "/templates/$templateId", params: { templateId } });
  const createTemplate = () => void navigate({ to: "/templates/new" });
  const signOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/" });
  };

  return (
    <>
      <Header
        templates={list}
        selectedTemplateId=""
        onSelectTemplate={selectTemplate}
        onCreateTemplate={createTemplate}
        onSignOut={() => void signOut()}
      />
      <TemplateWorkspace
        templates={list}
        selectedTemplateId=""
        onSelectTemplate={selectTemplate}
        onCreateTemplate={createTemplate}
        onSignOut={() => void signOut()}
      >
        {children}
      </TemplateWorkspace>
    </>
  );
}
