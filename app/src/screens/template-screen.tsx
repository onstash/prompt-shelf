import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Header } from "@/components/header";
import { TemplateCreator, type TemplateDraft } from "@/components/template-creator";
import { TemplateDetail } from "@/components/template-detail";
import { api, type Template, type TemplateField } from "@/lib/api";
import { authClient } from "@/lib/auth";

type Props = {
  templates: Template[];
  startCreating?: boolean;
  initialTemplateId?: string;
};
type Values = Record<string, string>;

const emptyField = (): TemplateField => ({
  key: "",
  label: "",
  type: "text",
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

export function TemplateScreen({ templates, startCreating = false, initialTemplateId }: Props) {
  const queryClient = useQueryClient();
  const initialTemplate =
    templates.find((template) => template.id === initialTemplateId) ?? templates[0];
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    initialTemplate?.id ?? "clear-first-draft",
  );
  const [creating, setCreating] = useState(startCreating);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TemplateDraft>(newDraft);
  const [values, setValues] = useState<Values>(() => emptyValues(initialTemplate));
  const [segments, setSegments] = useState<
    Array<{ type: "static" | "value"; text: string; key?: string }>
  >([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const templateQuery = useQuery({
    queryKey: ["templates", selectedTemplateId],
    queryFn: () => api.getTemplate(selectedTemplateId),
    enabled: !creating,
  });
  const template = templateQuery.data;
  const compileMutation = useMutation({
    mutationFn: (previewValues?: Values) =>
      api.compileTemplate(selectedTemplateId, previewValues ?? values),
    onSuccess: (result) => setSegments(result.segments),
  });

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

  const saveTemplate = async () => {
    if (!draft.title.trim() || !draft.body.trim())
      return toast.error("Add a title and prompt body first");
    if (draft.fields.some((field) => !field.key.trim() || !field.label.trim()))
      return toast.error("Complete every field key and label first");
    const keys = draft.fields.map((field) => field.key.trim());
    if (new Set(keys).size !== keys.length) return toast.error("Field keys must be unique");
    try {
      const savedTemplate = editing
        ? await api.updateTemplate(selectedTemplateId, draft)
        : await api.createTemplate(draft);
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
      setSelectedTemplateId(savedTemplate.id);
      setValues(emptyValues(savedTemplate));
      setCreating(false);
      setEditing(false);
      toast.success(editing ? "Template updated" : "Template created");
    } catch {
      toast.error("Could not save this template");
    }
  };

  const header = (
    <Header
      templates={templates}
      selectedTemplateId={selectedTemplateId}
      onSelectTemplate={(id) => {
        setSelectedTemplateId(id);
        setValues(emptyValues(templates.find((item) => item.id === id)));
        setSegments([]);
      }}
      onSignOut={() => void authClient.signOut()}
      onCreateTemplate={() => {
        setDraft(newDraft);
        setEditing(false);
        setCreating(true);
      }}
    />
  );

  if (creating) {
    return (
      <>
        {header}
        <TemplateCreator
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setCreating(false)}
          onSave={saveTemplate}
          emptyField={emptyField}
        />
      </>
    );
  }

  if (templateQuery.isPending) {
    return (
      <>
        {header}
        <main className="mx-auto max-w-7xl px-5 py-20 text-muted-foreground">
          Loading template…
        </main>
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
      <TemplateDetail
        template={template}
        loading={false}
        segments={segments}
        values={values}
        update={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        copied={copied}
        onCopy={async () => {
          if (!ready) return toast.error("Complete the required fields first");
          try {
            const result = await compileMutation.mutateAsync();
            await navigator.clipboard?.writeText(result.text);
            setCopied(true);
            toast.success("Prompt copied");
            setTimeout(() => setCopied(false), 1800);
          } catch {
            toast.error("Could not compile this prompt");
          }
        }}
        saved={saved}
        onSavePreset={() => {
          if (!ready) return toast.error("Complete the required fields first");
          setSaved(true);
          toast.success("Preset saved to your shelf");
        }}
        onEdit={() => {
          setDraft({
            title: template.title,
            description: template.description,
            body: template.body,
            fields: template.fields,
          });
          setEditing(true);
          setCreating(true);
        }}
      />
    </>
  );
}
