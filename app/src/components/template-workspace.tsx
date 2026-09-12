import type { ReactNode } from "react";
import { TemplateNavigation } from "@/components/template-navigation";
import type { Template } from "@/lib/api";

type Props = {
  children: ReactNode;
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onCreateTemplate: () => void;
  onSignOut: () => void;
};

export function TemplateWorkspace({
  children,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateTemplate,
  onSignOut,
}: Props) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1440px]">
      <aside className="hidden w-64 shrink-0 border-r lg:block">
        <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col p-4">
          <TemplateNavigation
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={onSelectTemplate}
            onCreateTemplate={onCreateTemplate}
            onSignOut={onSignOut}
          />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
