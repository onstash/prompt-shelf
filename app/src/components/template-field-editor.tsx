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
type Props = { draft: Draft; setDraft: (draft: Draft) => void };

export function TemplateFieldEditor({ draft, setDraft }: Props) {
  if (draft.fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-black/[.12] px-5 py-10 text-center">
        <p className="text-sm font-medium">No fields yet</p>
        <p className="mx-auto mt-2 max-w-64 text-sm leading-6 text-muted-foreground">
          Add a variable such as{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">{"{{topic}}"}</code> to your prompt.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-5 text-muted-foreground">
        Fields follow the variables in your prompt. Remove a field by deleting its variable from the
        prompt.
      </p>
      {draft.fields.map((field, index) => (
        <div
          key={field.key}
          className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-[#fafafa] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <code className="min-w-0 truncate text-xs text-muted-foreground">{`{{${field.key}}}`}</code>
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) => {
                  const fields = [...draft.fields];
                  fields[index] = { ...field, required: event.target.checked };
                  setDraft({ ...draft, fields });
                }}
              />
              Required
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`field-${field.key}-label`}>Label</Label>
            <Input
              id={`field-${field.key}-label`}
              value={field.label}
              onChange={(event) => {
                const fields = [...draft.fields];
                fields[index] = { ...field, label: event.target.value };
                setDraft({ ...draft, fields });
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`field-${field.key}-type`}>Answer type</Label>
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
              <SelectTrigger id={`field-${field.key}-type`}>
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Short text</SelectItem>
                <SelectItem value="textarea">Long text</SelectItem>
                <SelectItem value="select">Choose from options</SelectItem>
                <SelectItem value="number">Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field.type === "select" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`field-${field.key}-options`}>Options</Label>
              <Input
                id={`field-${field.key}-options`}
                placeholder="Clear, friendly, direct"
                value={(field.options ?? []).join(", ")}
                onChange={(event) => {
                  const fields = [...draft.fields];
                  fields[index] = {
                    ...field,
                    options: event.target.value
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  };
                  setDraft({ ...draft, fields });
                }}
              />
              <p className="text-xs text-muted-foreground">Separate options with commas.</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
