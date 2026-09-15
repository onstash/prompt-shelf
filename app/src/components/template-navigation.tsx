import { FileText, LogOut, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SavedRuns } from "@/components/saved-runs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/api";

type Props = {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onCreateTemplate: () => void;
  onSignOut: () => void;
  className?: string;
};

type GroupProps = Pick<Props, "selectedTemplateId" | "onSelectTemplate"> & {
  label: string;
  templates: Template[];
  kind: "owned" | "examples";
};

function TemplateGroup({
  label,
  templates,
  kind,
  selectedTemplateId,
  onSelectTemplate,
}: GroupProps) {
  if (templates.length === 0 && kind === "examples") return null;

  return (
    <section className="flex flex-col gap-1" aria-label={label}>
      <h3 className="px-3 py-1 text-xs font-semibold uppercase tracking-[.08em] text-muted-foreground">
        {label}
      </h3>
      {templates.length > 0 ? (
        templates.map((template) => {
          const selected = template.id === selectedTemplateId;
          return (
            <Button
              key={template.id}
              variant={selected ? "secondary" : "ghost"}
              className="h-auto w-full justify-start px-3 py-2.5 text-left whitespace-normal"
              aria-current={selected ? "page" : undefined}
              onClick={() => onSelectTemplate(template.id)}
            >
              <FileText data-icon="inline-start" />
              <span className="min-w-0 flex-1 truncate">{template.title}</span>
            </Button>
          );
        })
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">No templates yet</p>
      )}
    </section>
  );
}

export function TemplateNavigation({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateTemplate,
  onSignOut,
  className,
}: Props) {
  const ownedTemplates: Template[] = [];
  const examples: Template[] = [];
  for (const template of templates) {
    (template.isExample ? examples : ownedTemplates).push(template);
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
      <div className="flex items-center justify-between px-3 pt-1">
        <h2 className="text-sm font-semibold">My shelf</h2>
        <span className="text-xs text-muted-foreground">{templates.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant={selectedTemplateId ? "outline" : "secondary"}
          className="mx-1 justify-start"
          aria-current={selectedTemplateId ? undefined : "page"}
          onClick={onCreateTemplate}
        >
          <Plus data-icon="inline-start" /> New template
        </Button>
        <SavedRuns />
      </div>
      <nav aria-label="Templates" className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
        <TemplateGroup
          label="Your templates"
          templates={ownedTemplates}
          kind="owned"
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={onSelectTemplate}
        />
        <TemplateGroup
          label="Examples"
          templates={examples}
          kind="examples"
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={onSelectTemplate}
        />
      </nav>
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" className="w-full justify-start" />}
        >
          <LogOut data-icon="inline-start" /> Sign out
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of Prompt Shelf?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your private templates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onSignOut}>
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
