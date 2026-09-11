import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
            <Select
              value={field.type}
              onValueChange={(value) => {
                if (!value) return;
                const fields = [...draft.fields];
                // SAFETY: SelectItem values are constrained to FieldType literals below.
                fields[index] = { ...field, type: value as FieldType };
                setDraft({ ...draft, fields });
              }}
            >
              <SelectTrigger aria-label={`Field ${index + 1} type`} className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="number">Number</SelectItem>
              </SelectContent>
            </Select>
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
