import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldType, TemplateField } from "@/lib/api";

type Draft = { fields: TemplateField[] };
type Props = { draft: Draft; setDraft: (draft: Draft) => void; emptyField: () => TemplateField };

export function TemplateFieldEditor({ draft, setDraft, emptyField }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Form fields</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Define the answers people will provide.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDraft({ ...draft, fields: [...draft.fields, emptyField()] })}
        >
          <Plus data-icon="inline-start" /> Add field
        </Button>
      </div>
      {draft.fields.map((field, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-[#fafafa] p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Field ${index + 1} label`}
              placeholder="Field label"
              value={field.label}
              onChange={(e) => {
                const fields = [...draft.fields];
                fields[index] = { ...field, label: e.target.value };
                setDraft({ ...draft, fields });
              }}
            />
            <Input
              aria-label={`Field ${index + 1} key`}
              placeholder="field_key"
              value={field.key}
              onChange={(e) => {
                const fields = [...draft.fields];
                fields[index] = {
                  ...field,
                  key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
                };
                setDraft({ ...draft, fields });
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label={`Field ${index + 1} type`}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={field.type}
              onChange={(e) => {
                const fields = [...draft.fields];
                // SAFETY: the select options are limited to FieldType values.
                fields[index] = { ...field, type: e.target.value as FieldType };
                setDraft({ ...draft, fields });
              }}
            >
              <option value="text">Text</option>
              <option value="textarea">Textarea</option>
              <option value="select">Select</option>
              <option value="number">Number</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => {
                  const fields = [...draft.fields];
                  fields[index] = { ...field, required: e.target.checked };
                  setDraft({ ...draft, fields });
                }}
              />{" "}
              Required
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              onClick={() =>
                setDraft({
                  ...draft,
                  fields: draft.fields.filter((_, fieldIndex) => fieldIndex !== index),
                })
              }
            >
              Remove
            </Button>
          </div>
          {field.type === "select" && (
            <Input
              aria-label={`Field ${index + 1} options`}
              placeholder="Options, separated by commas"
              value={(field.options ?? []).join(", ")}
              onChange={(e) => {
                const fields = [...draft.fields];
                fields[index] = {
                  ...field,
                  options: e.target.value
                    .split(",")
                    .map((option) => option.trim())
                    .filter(Boolean),
                };
                setDraft({ ...draft, fields });
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
