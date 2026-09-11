import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TemplateCreator } from "@/components/template-creator";
import { TemplateDetail } from "@/components/template-detail";
import { api, type FieldType, type TemplateField } from "@/lib/api";
import "./index.css";

type Values = Record<string, string>;
const initial: Values = { idea: "", audience: "", tone: "clear", length: "short" };
const emptyField = (): TemplateField => ({
  key: "",
  label: "",
  type: "text",
  required: false,
  options: [],
});

function App() {
  const [selectedTemplateId, setSelectedTemplateId] = useState("clear-first-draft");
  const [values, setValues] = useState(initial);
  const templatesQuery = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });
  const [compiledSegments, setCompiledSegments] = useState<
    Array<{ type: "static" | "value"; text: string; key?: string }>
  >([]);
  const templateQuery = useQuery({
    queryKey: ["templates", selectedTemplateId],
    queryFn: () => api.getTemplate(selectedTemplateId),
  });
  const template = templateQuery.data;
  const loadingTemplate = templateQuery.isLoading;
  const compileMutation = useMutation({
    mutationFn: (previewValues?: Record<string, string>) =>
      api.compileTemplate(
        selectedTemplateId,
        previewValues ?? {
          ...values,
          tone: tone ?? "",
          length: length ?? "",
        },
      ),
    onSuccess: (result) => {
      setCompiledSegments(result.segments);
    },
  });
  useEffect(() => {
    if (!template) return;
    compileMutation.mutate(
      Object.fromEntries(
        template.fields.map((field) => [
          field.key,
          // SAFETY: template field keys correspond to the supported runtime form values.
          values[field.key as keyof Values] || `[${field.label}]`,
        ]),
      ),
    );
  }, [template, values]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  // SAFETY: the initial draft fields are explicitly constructed as TemplateField values.
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    body: "You are a thoughtful writing partner.\n\nCreate a {{idea}} for {{audience}} in a {{tone}} voice.",
    fields: [
      {
        key: "idea",
        label: "What are you writing?",
        // SAFETY: this literal is one of the supported template field types.
        type: "textarea" as FieldType,
        required: true,
        options: [],
      },
      {
        key: "audience",
        label: "Who is it for?",
        // SAFETY: this literal is one of the supported template field types.
        type: "text" as FieldType,
        required: true,
        options: [],
      },
      // SAFETY: every initial field satisfies the TemplateField contract.
    ] as TemplateField[],
  });
  const update = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const ready = values.idea.trim() !== "" && values.audience.trim() !== "";
  const tone = {
    clear: "clear and conversational",
    warm: "warm and encouraging",
    direct: "direct and confident",
  }[values.tone];
  const length = {
    short: "short and skimmable",
    medium: "a few useful paragraphs",
    long: "detailed and thorough",
  }[values.length];
  const copyPrompt = async () => {
    if (!ready) return toast.error("Add the two required details first");
    try {
      const result = await compileMutation.mutateAsync();
      await navigator.clipboard?.writeText(result.text);
    } catch {
      return toast.error("Could not compile this prompt");
    }
    setCopied(true);
    toast.success("Prompt copied");
    setTimeout(() => setCopied(false), 1800);
  };
  const saveTemplate = async () => {
    if (!draft.title.trim() || !draft.body.trim())
      return toast.error("Add a title and prompt body first");
    if (draft.fields.some((field) => !field.key.trim() || !field.label.trim()))
      return toast.error("Complete every field key and label first");
    const keys = draft.fields.map((field) => field.key.trim());
    if (new Set(keys).size !== keys.length) return toast.error("Field keys must be unique");
    try {
      await api.createTemplate(draft);
      setCreating(false);
      toast.success("Template created");
    } catch {
      toast.error("Start the local API to create templates");
    }
  };
  const savePreset = () => {
    if (!ready) return toast.error("Complete the required fields first");
    setSaved(true);
    toast.success("Preset saved to your shelf");
  };
  return (
    <div className="min-h-screen bg-[#f8f8f6] text-[#202124]">
      <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <a className="flex items-center gap-2 font-semibold tracking-[-.04em]" href="#">
            Prompt Shelf
          </a>
          <nav className="flex items-center gap-2">
            <Select
              value={selectedTemplateId}
              onValueChange={(value) => {
                if (!value) return;
                setSelectedTemplateId(value);
                setValues(initial);
                setCompiledSegments([]);
              }}
            >
              <SelectTrigger className="hidden w-auto text-muted-foreground sm:inline-flex">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {(templatesQuery.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" /> New template
            </Button>
            <Button variant="ghost" size="icon" aria-label="Account">
              <span className="text-xs font-semibold">SV</span>
            </Button>
          </nav>
        </div>
      </header>
      {creating ? (
        <TemplateCreator
          draft={draft}
          setDraft={setDraft}
          onCancel={() => setCreating(false)}
          onSave={saveTemplate}
          emptyField={emptyField}
        />
      ) : (
        <TemplateDetail
          template={template}
          loading={loadingTemplate}
          segments={compiledSegments}
          values={values}
          update={update}
          copied={copied}
          onCopy={copyPrompt}
          saved={saved}
          onSavePreset={savePreset}
        />
      )}
      <Toaster position="bottom-center" />
    </div>
  );
}
export default App;
