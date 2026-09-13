import { useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  isSaving?: boolean;
};

export function TemplateCreator({
  draft,
  mode,
  setDraft,
  onCancel,
  onSave,
  onDelete,
  emptyField,
  isSaving = false,
}: Props) {
  const fieldMemory = useRef(new Map(draft.fields.map((field) => [field.key, field] as const)));

  const updateBody = (body: string) => {
    for (const field of draft.fields) fieldMemory.current.set(field.key, field);

    const keys = [...body.matchAll(/{{\s*([\w-]+)\s*}}/g)].map((match) => match[1]);
    const fields = [...new Set(keys)].map((key) => {
      const existing =
        draft.fields.find((field) => field.key === key) ?? fieldMemory.current.get(key);
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

  const isEditing = mode === "edit";

  return (
    <form
      className="mx-auto max-w-7xl px-5 py-10"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <section className="mb-9 max-w-3xl">
        <Badge variant="outline" className="mb-4">
          {isEditing ? "Editing" : "New template"}
        </Badge>
        <h1 className="break-words text-4xl font-semibold tracking-[-.055em] [overflow-wrap:anywhere] sm:text-5xl">
          {isEditing ? "Edit template" : "Create template"}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Write the prompt once. Fields appear automatically as you add variables such as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-base">{"{{topic}}"}</code>.
        </p>
      </section>

      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <Card className="min-w-0 overflow-hidden border-black/[.08] bg-white shadow-sm">
          <CardHeader className="border-b bg-white/60 px-6 py-4">
            <CardTitle className="text-base">Template details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 px-6 !py-7">
            <div className="flex flex-col gap-2">
              <Label htmlFor="template-title">Template name</Label>
              <Input
                id="template-title"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="e.g. Clear first draft"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="What will this help someone do?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="template-body">Prompt instructions</Label>
              <p className="text-xs leading-5 text-muted-foreground">
                Wrap each answer in braces, such as{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">{"{{audience}}"}</code>. Its field
                appears automatically.
              </p>
              <Textarea
                id="template-body"
                purpose="document"
                value={draft.body}
                onChange={(event) => updateBody(event.target.value)}
                placeholder={"Write a concise summary for {{audience}} in a {{tone}} tone."}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-black/[.08] bg-white shadow-sm">
          <CardHeader className="border-b bg-white/60 px-6 py-4">
            <CardTitle className="text-base">Prompt fields</CardTitle>
          </CardHeader>
          <CardContent className="px-6 !py-7">
            <TemplateFieldEditor
              draft={{ fields: draft.fields }}
              setDraft={(next) => setDraft({ ...draft, ...next })}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-black/[.08] bg-white p-3 shadow-sm">
        {isEditing && onDelete ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
              <Trash2 data-icon="inline-start" /> Delete template
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the template, its versions, and saved runs. This action
                  cannot be undone.
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
        <Button
          type="button"
          variant="ghost"
          className="ml-auto"
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create template"}
        </Button>
      </div>
    </form>
  );
}
