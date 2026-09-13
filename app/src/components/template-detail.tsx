import { Bookmark, SlidersHorizontal } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Template } from "@/lib/api";
import { PromptPreview } from "@/components/prompt-preview";
import { TemplateVersionHistory } from "@/components/template-version-history";

type Values = Record<string, string>;

function revisionLabel(template?: Template) {
  if (!template) return "Loading revision…";
  if (!template.updatedAt) return `Version ${template.version}`;
  const timestamp = template.updatedAt.includes("T")
    ? template.updatedAt
    : `${template.updatedAt.replace(" ", "T")}Z`;
  const updated = new Date(timestamp);
  const today = new Date();
  const isToday = updated.toDateString() === today.toDateString();
  const date = isToday
    ? "today"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(updated);
  return `Version ${template.version} · ${date}`;
}

type CustomizeProps = {
  fields: Template["fields"];
  values: Values;
  update: (key: string, value: string) => void;
  onAddToShelf?: () => void;
  onClearAnswers: () => void;
  variant: "owned" | "example";
  idPrefix: string;
};

function CustomizeForm({
  fields,
  values,
  update,
  onAddToShelf,
  onClearAnswers,
  variant,
  idPrefix,
}: CustomizeProps) {
  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
        <p className="text-sm font-medium">No fields to complete</p>
        <p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-muted-foreground">
          This prompt is ready to copy as written.
        </p>
        {variant === "example" ? (
          <Button className="mt-5" variant="outline" onClick={onAddToShelf}>
            <Bookmark data-icon="inline-start" /> Add to my shelf
          </Button>
        ) : null}
      </div>
    );
  }

  const ready = fields
    .filter((field) => field.required)
    .every((field) => values[field.key]?.trim());

  return (
    <>
      <div className="flex flex-col gap-5">
        {fields.map((field) => {
          const id = `${idPrefix}-${field.key}`;
          return (
            <div className="flex flex-col gap-2" key={field.key}>
              <Label htmlFor={id}>
                {field.label}
                {field.required ? (
                  <span className="text-xs font-normal text-muted-foreground"> Required</span>
                ) : null}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={id}
                  value={values[field.key] ?? ""}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              ) : field.type === "select" ? (
                <Select
                  value={values[field.key] ?? ""}
                  onValueChange={(value) => value && update(field.key, value)}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={id}
                  type={field.type === "number" ? "number" : "text"}
                  value={values[field.key] ?? ""}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
      <Separator className="my-6" />
      <div className="flex flex-wrap items-center gap-3">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" disabled={!fields.some((field) => values[field.key])} />
            }
          >
            Clear answers
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all answers?</AlertDialogTitle>
              <AlertDialogDescription>
                Every field in this prompt will be emptied. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onClearAnswers}>
                Clear answers
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <span
          className={
            ready ? "ml-auto text-xs text-emerald-700" : "ml-auto text-xs text-muted-foreground"
          }
        >
          {ready ? "Ready to copy" : "Start with the required fields"}
        </span>
        {variant === "example" ? (
          <Button variant="outline" onClick={onAddToShelf}>
            <Bookmark data-icon="inline-start" /> Add to my shelf
          </Button>
        ) : null}
      </div>
    </>
  );
}

type Props = {
  template?: Template;
  segments: Array<{ type: "static" | "value"; text: string; key?: string }>;
  values: Values;
  update: (key: string, value: string) => void;
  copied: boolean;
  onCopy: () => void;
  onAddToShelf?: () => void;
  onClearAnswers: () => void;
  onEdit: () => void;
  variant?: "owned" | "example";
};

export function TemplateDetail({
  template,
  segments,
  values,
  update,
  copied,
  onCopy,
  onAddToShelf,
  onClearAnswers,
  onEdit,
  variant = "owned",
}: Props) {
  const fields = template?.fields ?? [];
  const isExample = variant === "example";
  const versionHistory =
    template && template.version > 1 ? <TemplateVersionHistory template={template} /> : null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <section className="mb-9 max-w-3xl">
        {isExample ? (
          <Badge variant="outline" className="mb-4">
            Example
          </Badge>
        ) : null}
        <h1 className="break-words text-4xl font-semibold tracking-[-.055em] [overflow-wrap:anywhere] sm:text-5xl">
          {template?.title ?? "Untitled template"}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {template?.description || "Fill in the fields to build a prompt you can copy anywhere."}
        </p>
      </section>
      <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <Sheet>
          <PromptPreview
            segments={segments}
            copied={copied}
            onCopy={onCopy}
            onEdit={isExample ? undefined : onEdit}
            revisionLabel={revisionLabel(template)}
          >
            <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
              <SlidersHorizontal data-icon="inline-start" /> Customize
            </SheetTrigger>
            {versionHistory}
          </PromptPreview>
          <SheetContent
            side="bottom"
            className="max-h-[90dvh] rounded-t-2xl lg:hidden"
            showCloseButton
          >
            <SheetHeader className="border-b pr-12">
              <SheetTitle>Customize</SheetTitle>
              <SheetDescription>
                {fields.length === 0
                  ? "This prompt can be copied without customization."
                  : `Complete ${fields.length} ${fields.length === 1 ? "field" : "fields"} to build your prompt.`}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <CustomizeForm
                fields={fields}
                values={values}
                update={update}
                onAddToShelf={onAddToShelf}
                onClearAnswers={onClearAnswers}
                variant={variant}
                idPrefix="mobile-field"
              />
            </div>
          </SheetContent>
          <Card className="hidden h-[clamp(360px,55dvh,560px)] min-w-0 overflow-hidden border-black/[.08] shadow-sm lg:flex lg:flex-col">
            <CardHeader className="border-b bg-white/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Customize</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {fields.length} {fields.length === 1 ? "field" : "fields"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-6">
              <CustomizeForm
                fields={fields}
                values={values}
                update={update}
                onAddToShelf={onAddToShelf}
                onClearAnswers={onClearAnswers}
                variant={variant}
                idPrefix="desktop-field"
              />
            </CardContent>
          </Card>
        </Sheet>
      </div>
    </main>
  );
}
