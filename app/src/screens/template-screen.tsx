import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { TemplateCreator, type TemplateDraft } from "@/components/template-creator";
import { TemplateDetail } from "@/components/template-detail";
import { TemplateDetailSkeleton } from "@/components/template-detail-skeleton";
import { TemplateWorkspace } from "@/components/template-workspace";
import { api, type Template, type TemplateField } from "@/lib/api";
import { authClient } from "@/lib/auth";

type Props = {
  templates: Template[];
  mode: "view" | "create" | "edit";
  initialTemplateId?: string;
};
type Values = Record<string, string>;

const emptyField = (): TemplateField => ({
  key: "",
  label: "",
  type: "textarea",
  required: false,
  options: [],
});

const newDraft: TemplateDraft = {
  title: "",
  description: "",
  body: "",
  fields: [],
};

const emptyValues = (template?: Template) =>
  Object.fromEntries((template?.fields ?? []).map((field) => [field.key, ""]));

export function TemplateScreen({ templates, mode, initialTemplateId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requestedTemplate = templates.find((template) => template.id === initialTemplateId);
  const initialTemplate =
    mode === "create"
      ? undefined
      : mode === "edit"
        ? requestedTemplate
        : (requestedTemplate ?? templates[0]);
  const selectedTemplateId = initialTemplate?.id ?? "";
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(mode === "view" ? null : mode);
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    mode === "edit" && initialTemplate
      ? {
          title: initialTemplate.title,
          description: initialTemplate.description,
          body: initialTemplate.body,
          fields: initialTemplate.fields,
        }
      : newDraft,
  );
  const [values, setValues] = useState<Values>(() => emptyValues(initialTemplate));
  const [segments, setSegments] = useState<
    Array<{ type: "static" | "value"; text: string; key?: string }>
  >([]);
  const [copied, setCopied] = useState(false);
  const openedTemplateIds = useRef(new Set<string>());
  const startedTemplateIds = useRef(new Set<string>());
  const track = (
    name: "template_opened" | "form_started" | "prompt_copied" | "template_created",
    templateId = selectedTemplateId,
  ) => {
    void api.trackProductEvent(name, templateId).catch(() => undefined);
  };

  const templateQuery = useQuery({
    queryKey: ["templates", selectedTemplateId],
    queryFn: () => api.getTemplate(selectedTemplateId),
    enabled: !formMode,
  });
  const template = templateQuery.data;
  const compileMutation = useMutation({
    mutationFn: (previewValues?: Values) =>
      api.compileTemplate(selectedTemplateId, previewValues ?? values),
    onSuccess: (result) => setSegments(result.segments),
  });
  const saveMutation = useMutation({
    mutationFn: () =>
      formMode === "edit"
        ? api.updateTemplate(selectedTemplateId, draft)
        : api.createTemplate(draft),
  });

  useEffect(() => {
    if (!template || openedTemplateIds.current.has(template.id)) return;
    openedTemplateIds.current.add(template.id);
    track("template_opened", template.id);
  }, [template]);

  useEffect(() => {
    if (!template) return;
    compileMutation.mutate(
      Object.fromEntries(
        template.fields.map((field) => [field.key, values[field.key] || `[${field.label}]`]),
      ),
    );
  }, [template, values]);

  const ready = (template?.fields ?? [])
    .filter((field) => field.required)
    .every((field) => values[field.key]?.trim());

  const startTemplateDraft = () => {
    if (!template) return;
    if (!template.isExample) {
      void navigate({
        to: "/templates/$templateId/edit",
        params: { templateId: template.id },
      });
      return;
    }
    setDraft({
      title: template.title,
      description: template.description,
      body: template.body,
      fields: template.fields,
    });
    setFormMode("create");
  };

  const deleteTemplate = async () => {
    try {
      await api.deleteTemplate(selectedTemplateId);
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast.success("Template deleted");
      await navigate({ to: "/templates" });
    } catch {
      toast.error("Could not delete this template");
    }
  };

  const saveTemplate = async () => {
    if (!draft.title.trim() || !draft.body.trim())
      return toast.error("Add a title and prompt body first");
    if (draft.fields.some((field) => !field.key.trim() || !field.label.trim()))
      return toast.error("Complete every field key and label first");
    const keys = draft.fields.map((field) => field.key.trim());
    if (new Set(keys).size !== keys.length) return toast.error("Field keys must be unique");
    try {
      const savedTemplate = await saveMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setValues(emptyValues(savedTemplate));
      setFormMode(null);
      toast.success(formMode === "edit" ? "Template updated" : "Template created");
      if (formMode === "create") track("template_created", savedTemplate.id);
      await navigate({
        to: "/templates/$templateId",
        params: { templateId: savedTemplate.id },
      });
    } catch {
      toast.error("Could not save this template");
    }
  };

  const selectTemplate = (id: string) => {
    void navigate({ to: "/templates/$templateId", params: { templateId: id } });
  };
  const createTemplate = () => void navigate({ to: "/templates/new" });
  const signOut = () => void authClient.signOut();
  const header = (
    <Header
      templates={templates}
      selectedTemplateId={selectedTemplateId}
      onSelectTemplate={selectTemplate}
      onSignOut={signOut}
      onCreateTemplate={createTemplate}
    />
  );

  if (formMode === "edit" && !initialTemplate) {
    return (
      <>
        {header}
        <TemplateWorkspace
          templates={templates}
          selectedTemplateId=""
          onSelectTemplate={selectTemplate}
          onCreateTemplate={createTemplate}
          onSignOut={signOut}
        >
          <main className="mx-auto max-w-7xl px-5 py-20">
            <h1 className="text-2xl font-semibold">Template not found</h1>
            <p className="mt-2 text-muted-foreground">
              It may have been deleted or you may not have access to it.
            </p>
            <Button className="mt-6" onClick={() => void navigate({ to: "/templates" })}>
              Back to my shelf
            </Button>
          </main>
        </TemplateWorkspace>
      </>
    );
  }

  if (formMode) {
    return (
      <>
        {header}
        <TemplateWorkspace
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={selectTemplate}
          onCreateTemplate={createTemplate}
          onSignOut={signOut}
        >
          <TemplateCreator
            draft={draft}
            mode={formMode}
            setDraft={setDraft}
            onCancel={() =>
              void navigate(
                formMode === "create"
                  ? { to: "/templates" }
                  : {
                      to: "/templates/$templateId",
                      params: { templateId: selectedTemplateId },
                    },
              )
            }
            onSave={saveTemplate}
            isSaving={saveMutation.isPending}
            onDelete={formMode === "edit" ? deleteTemplate : undefined}
            emptyField={emptyField}
          />
        </TemplateWorkspace>
      </>
    );
  }

  if (templateQuery.isPending) {
    return (
      <>
        {header}
        <TemplateWorkspace
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={selectTemplate}
          onCreateTemplate={createTemplate}
          onSignOut={signOut}
        >
          <TemplateDetailSkeleton />
        </TemplateWorkspace>
      </>
    );
  }

  if (templateQuery.isError || !template) {
    return (
      <>
        {header}
        <main className="mx-auto max-w-7xl px-5 py-20">
          <h1 className="text-2xl font-semibold">Could not load this template</h1>
          <p className="mt-2 text-muted-foreground">Try refreshing or choose another template.</p>
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <TemplateWorkspace
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={selectTemplate}
        onCreateTemplate={createTemplate}
        onSignOut={signOut}
      >
        <TemplateDetail
          template={template}
          segments={segments}
          values={values}
          update={(key, value) => {
            if (!startedTemplateIds.current.has(template.id)) {
              startedTemplateIds.current.add(template.id);
              track("form_started", template.id);
            }
            setValues((current) => ({ ...current, [key]: value }));
          }}
          copied={copied}
          onCopy={async () => {
            if (!ready) return toast.error("Complete the required fields first");
            try {
              const result = await compileMutation.mutateAsync();
              await navigator.clipboard?.writeText(result.text);
              setCopied(true);
              track("prompt_copied", template.id);
              toast.success("Prompt copied");
              setTimeout(() => setCopied(false), 1800);
            } catch {
              toast.error("Could not compile this prompt");
            }
          }}
          onAddToShelf={template.isExample ? startTemplateDraft : undefined}
          onClearAnswers={() => setValues(emptyValues(template))}
          onEdit={startTemplateDraft}
          variant={template.isExample ? "example" : "owned"}
        />
      </TemplateWorkspace>
    </>
  );
}
