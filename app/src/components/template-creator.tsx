import { useRef, useState } from "react";
import { Eraser, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TemplateFieldEditor } from "@/components/template-field-editor";
import type { TemplateField } from "@/lib/api";
import {
  parseMarkdownSections,
  renumberSectionsAfterDeletion,
  serializeMarkdownSections,
  type DraftSection,
} from "@/lib/markdown-sections";

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
  const [sections, setSections] = useState<DraftSection[]>(() => parseMarkdownSections(draft.body));
  const [activeSectionId, setActiveSectionId] = useState("");
  const [focusSectionId, setFocusSectionId] = useState<string | null>(null);

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

  const updateSections = (nextSections: DraftSection[]) => {
    setSections(nextSections);
    updateBody(serializeMarkdownSections(nextSections));
  };

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];

  const uniqueHeading = (heading: string, sectionId: string) => {
    const trimmed = heading.trim() || "Untitled section";
    if (!sections.some((section) => section.id !== sectionId && section.heading === trimmed)) {
      return trimmed;
    }

    let suffix = 2;
    while (
      sections.some(
        (section) => section.id !== sectionId && section.heading === `${trimmed} ${suffix}`,
      )
    ) {
      suffix += 1;
    }
    return `${trimmed} ${suffix}`;
  };

  const isEditing = mode === "edit";
  const deleteSection = () => {
    if (!activeSection) return;

    const nextSections = renumberSectionsAfterDeletion(
      sections.filter((section) => section.id !== activeSection.id),
      activeSection.heading,
    );

    updateSections(nextSections);
    setActiveSectionId(nextSections[0]?.id ?? "");
  };

  const clearDraft = () => {
    fieldMemory.current.clear();
    const nextSections = parseMarkdownSections("");
    setSections(nextSections);
    setActiveSectionId(nextSections[0].id);
    setDraft({ title: "", description: "", body: "", fields: [] });
  };

  return (
    <form
      className="mx-auto max-w-7xl px-5 py-10"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <section className="mb-9 max-w-3xl">
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
                {isEditing ? (
                  <>
                    Edit Markdown sections separately. Variables such as{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5">{"{{audience}}"}</code> still
                    create fields automatically.
                  </>
                ) : (
                  <>
                    Wrap each answer in braces, such as{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5">{"{{audience}}"}</code>. Its
                    field appears automatically.
                  </>
                )}
              </p>
              {isEditing ? (
                <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(9rem,0.32fr)_minmax(0,1fr)]">
                  <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible">
                    {sections.map((section) => (
                      <Button
                        key={section.id}
                        type="button"
                        variant={section.id === activeSection?.id ? "secondary" : "ghost"}
                        className="min-w-0 max-w-full shrink-0 justify-start md:w-full"
                        onClick={() => setActiveSectionId(section.id)}
                      >
                        <span className="min-w-0 truncate">{section.heading}</span>
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 md:mt-2 md:w-full"
                      onClick={() => {
                        const section = {
                          id: `section-${crypto.randomUUID()}`,
                          heading: uniqueHeading("New section", ""),
                          level: 1,
                          body: "",
                        };
                        updateSections([...sections, section]);
                        setActiveSectionId(section.id);
                        setFocusSectionId(section.id);
                      }}
                    >
                      + Add section
                    </Button>
                  </div>
                  {activeSection ? (
                    <div className="min-w-0 space-y-3">
                      <div className="flex min-w-0 gap-2">
                        <Input
                          autoFocus={focusSectionId === activeSection.id}
                          aria-label="Section heading"
                          value={activeSection.heading}
                          onChange={(event) => {
                            setFocusSectionId(null);
                            updateSections(
                              sections.map((section) =>
                                section.id === activeSection.id
                                  ? {
                                      ...section,
                                      heading: uniqueHeading(event.target.value, section.id),
                                    }
                                  : section,
                              ),
                            );
                          }}
                        />
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                aria-label="Delete section"
                                title="Delete section"
                              />
                            }
                          >
                            <Trash2 />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this section?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the section heading and its prompt content
                                from this draft.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={deleteSection}>
                                Delete section
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <Textarea
                        id="template-body"
                        purpose="document"
                        value={activeSection.body}
                        onChange={(event) =>
                          updateSections(
                            sections.map((section) =>
                              section.id === activeSection.id
                                ? { ...section, body: event.target.value }
                                : section,
                            ),
                          )
                        }
                        placeholder="Write this section of the prompt."
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <Textarea
                  id="template-body"
                  purpose="document"
                  value={draft.body}
                  onChange={(event) => updateBody(event.target.value)}
                  placeholder={"Write a concise summary for {{audience}} in a {{tone}} tone."}
                />
              )}
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
        {isEditing ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
              <Eraser data-icon="inline-start" /> Clear
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear this draft?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears the template name, description, prompt, and fields. You can still
                  cancel editing to keep the saved template.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={clearDraft}>
                  Clear draft
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        {isEditing && onDelete ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" variant="outline" />}>
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
