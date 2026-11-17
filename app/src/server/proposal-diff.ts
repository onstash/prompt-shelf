import type { Field, TemplateInput } from "./template-repository.ts";

export type LineChange = { kind: "same" | "added" | "removed"; text: string };

export type FieldChange = {
  key: string;
  kind: "added" | "removed" | "changed";
  /** True when saved answers or existing prompt text could stop matching the template. */
  breaking: boolean;
  details: string[];
};

export type MetadataChange = {
  name: "title" | "description" | "category";
  from: string;
  to: string;
};

export type ProposalDiff = {
  body: LineChange[];
  addedTokens: string[];
  removedTokens: string[];
  fields: FieldChange[];
  metadata: MetadataChange[];
  breaking: boolean;
};

const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g;

/** Keys referenced as `{{key}}` in a prompt body. */
export function tokensIn(body: string): Set<string> {
  return new Set(Array.from(body.matchAll(TOKEN_PATTERN), (match) => match[1] ?? ""));
}

/** Line diff by longest common subsequence. Prompts are short, so the quadratic table is fine. */
export function diffLines(from: string, to: string): LineChange[] {
  const left = from.split("\n");
  const right = to.split("\n");
  const table: number[][] = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0),
  );
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i]![j] =
        left[i] === right[j]
          ? table[i + 1]![j + 1]! + 1
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const changes: LineChange[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      changes.push({ kind: "same", text: left[i] ?? "" });
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      changes.push({ kind: "removed", text: left[i] ?? "" });
      i += 1;
    } else {
      changes.push({ kind: "added", text: right[j] ?? "" });
      j += 1;
    }
  }
  while (i < left.length) changes.push({ kind: "removed", text: left[i++] ?? "" });
  while (j < right.length) changes.push({ kind: "added", text: right[j++] ?? "" });
  return changes;
}

function fieldDetails(before: Field, after: Field): { details: string[]; breaking: boolean } {
  const details: string[] = [];
  let breaking = false;
  if (before.type !== after.type) {
    details.push(`type ${before.type} -> ${after.type}`);
    breaking = true;
  }
  if (JSON.stringify(before.options ?? []) !== JSON.stringify(after.options ?? [])) {
    details.push("options changed");
    breaking = true;
  }
  if (before.label !== after.label) details.push(`label "${before.label}" -> "${after.label}"`);
  if (Boolean(before.required) !== Boolean(after.required)) {
    details.push(after.required ? "now required" : "no longer required");
  }
  return { details, breaking };
}

/** Field changes keyed by field key. Removing a key or changing its type or options is breaking. */
export function diffFields(from: Field[], to: Field[]): FieldChange[] {
  const before = new Map(from.map((field) => [field.key, field]));
  const after = new Map(to.map((field) => [field.key, field]));
  const changes: FieldChange[] = [];
  for (const [key, field] of before) {
    const next = after.get(key);
    if (!next) {
      changes.push({ key, kind: "removed", breaking: true, details: [] });
      continue;
    }
    const { details, breaking } = fieldDetails(field, next);
    if (details.length) changes.push({ key, kind: "changed", breaking, details });
  }
  for (const key of after.keys()) {
    if (!before.has(key)) changes.push({ key, kind: "added", breaking: false, details: [] });
  }
  return changes;
}

/** Diff of a proposal against the template it would replace. Computed on the server only. */
export function diffProposal(current: TemplateInput, proposed: TemplateInput): ProposalDiff {
  const currentTokens = tokensIn(current.body);
  const proposedTokens = tokensIn(proposed.body);
  const fields = diffFields(current.fields, proposed.fields);
  const metadata: MetadataChange[] = [];
  for (const name of ["title", "description", "category"] as const) {
    if (current[name] !== proposed[name]) {
      metadata.push({ name, from: current[name], to: proposed[name] });
    }
  }
  return {
    body: diffLines(current.body, proposed.body),
    addedTokens: [...proposedTokens].filter((token) => !currentTokens.has(token)),
    removedTokens: [...currentTokens].filter((token) => !proposedTokens.has(token)),
    fields,
    metadata,
    breaking: fields.some((change) => change.breaking),
  };
}
