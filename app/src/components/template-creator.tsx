import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TemplateFieldEditor } from "@/components/template-field-editor";
import type { TemplateField } from "@/lib/api";

export type TemplateDraft = {
  title: string;
  description: string;
  body: string;
  fields: TemplateField[];
};
type Props = {
  draft: TemplateDraft;
  setDraft: (draft: TemplateDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  emptyField: () => TemplateField;
};

export function TemplateCreator({ draft, setDraft, onCancel, onSave, emptyField }: Props) {
  return (
    <main className="mx-auto max-w-[760px] px-5 py-10">
      <button className="mb-8 text-sm text-muted-foreground" onClick={onCancel}>
        ← Back to shelf
      </button>
      <section className="mb-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.08em] text-blue-600">
          New template
        </div>
        <h1 className="text-4xl font-semibold tracking-[-.055em]">Create something reusable</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Turn a workflow you repeat into a simple form.
        </p>
      </section>
      <Card className="overflow-hidden border-black/[.08] bg-white shadow-sm">
        <CardContent className="flex flex-col gap-6 px-6 !py-7">
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-title">Template name</Label>
            <Input
              id="template-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Clear first draft"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-description">Description</Label>
            <Input
              id="template-description"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="What will this help someone do?"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="template-body">Prompt instructions</Label>
            <p className="text-xs text-muted-foreground">
              Use <code className="rounded bg-muted px-1.5 py-0.5">{"{{field_key}}"}</code> where
              the form should add an answer.
            </p>
            <Textarea
              id="template-body"
              className="min-h-56 font-mono text-sm leading-7"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </div>
          <Separator />
          <TemplateFieldEditor
            draft={{ fields: draft.fields }}
            setDraft={(next) => setDraft({ ...draft, ...next })}
            emptyField={emptyField}
          />
          <Separator />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>Create template</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
