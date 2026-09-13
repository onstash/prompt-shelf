import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { TemplateDetail } from "@/components/template-detail";
import { TemplateDetailSkeleton } from "@/components/template-detail-skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Props = { onBack: () => void; onUseExample: () => void };

export function ExampleScreen({ onBack, onUseExample }: Props) {
  const example = useQuery({
    queryKey: ["examples", "clear-first-draft"],
    queryFn: () => api.getExample("clear-first-draft"),
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [segments, setSegments] = useState<
    Array<{ type: "static" | "value"; text: string; key?: string }>
  >([]);
  const [copied, setCopied] = useState(false);
  const formStarted = useRef(false);
  const opened = useRef(false);
  const track = (name: "template_opened" | "form_started" | "prompt_copied") => {
    void api.trackProductEvent(name, "clear-first-draft").catch(() => undefined);
  };
  const compile = useMutation({
    mutationFn: (previewValues: Record<string, string>) =>
      api.compileExample("clear-first-draft", previewValues),
    onSuccess: (result) => setSegments(result.segments),
  });

  useEffect(() => {
    if (!example.data || opened.current) return;
    opened.current = true;
    track("template_opened");
  }, [example.data]);

  useEffect(() => {
    if (!example.data) return;
    compile.mutate(
      Object.fromEntries(
        example.data.fields.map((field) => [field.key, values[field.key] || `[${field.label}]`]),
      ),
    );
  }, [example.data, values]);

  if (example.isPending) return <TemplateDetailSkeleton variant="example" />;

  if (example.isError) {
    return <main className="mx-auto max-w-7xl px-5 py-20">Could not load the example.</main>;
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 pt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Back
        </Button>
      </div>
      <TemplateDetail
        template={example.data}
        segments={segments}
        values={values}
        update={(key, value) => {
          if (!formStarted.current) {
            formStarted.current = true;
            track("form_started");
          }
          setValues((current) => ({ ...current, [key]: value }));
        }}
        copied={copied}
        onCopy={async () => {
          await navigator.clipboard.writeText(segments.map((segment) => segment.text).join(""));
          setCopied(true);
          track("prompt_copied");
          toast.success("Prompt copied");
        }}
        onAddToShelf={onUseExample}
        onClearAnswers={() => setValues({})}
        onEdit={onUseExample}
        variant="example"
      />
    </>
  );
}
