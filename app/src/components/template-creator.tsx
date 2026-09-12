import { Trash2 } from "lucide-react";
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
  mode: "create" | "edit";
  setDraft: (draft: TemplateDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
  emptyField: () => TemplateField;
};

export function TemplateCreator({
  draft,
  mode,
  setDraft,
  onCancel,
  onSave,
  onDelete,
  emptyField,
}: Props) {
  const updateBody = (body: string) => {
    const keys = [...body.matchAll(/{{\s*([\w-]+)\s*}}/g)].map((match) => match[1]);
    const uniqueKeys = [...new Set(keys)];
    const fields = uniqueKeys.map((key) => {
      const existing = draft.fields.find((field) => field.key === key);
      if (existing) return existing;
      return {
        ...emptyField(),
        key,
        label: key.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
        required: true,
      };
    });
    setDraft({ ...draft, body, fields });
  };

  return (
    <main className="mx-auto max-w-[760px] px-5 py-10">
      <button className="mb-8 text-sm text-muted-foreground" onClick={onCancel}>
        ← Back to shelf
      </button>
      <section className="mb-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.08em] text-blue-600">
          {mode === "edit" ? "Edit template" : "New template"}
        </div>
        <h1 className="text-4xl font-semibold tracking-[-.055em]">
          {mode === "edit" ? "Update your template" : "Create something reusable"}
        </h1>
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Variables are added to the form when you parse the prompt.
              </p>
              <Button type="button" variant="outline" onClick={() => updateBody(draft.body)}>
                Parse template
              </Button>
            </div>
          </div>
          <Separator />
          <TemplateFieldEditor
            draft={{ fields: draft.fields }}
            setDraft={(next) => setDraft({ ...draft, ...next })}
            emptyField={emptyField}
          />
          <Separator />
          <div className="flex items-center gap-2">
            {onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="destructive" />}>
                  <Trash2 data-icon="inline-start" /> Delete template
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the template, its versions, and saved runs. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onDelete}>
                      Delete template
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button variant="ghost" className="ml-auto" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={onSave}>{mode === "edit" ? "Save changes" : "Create template"}</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
