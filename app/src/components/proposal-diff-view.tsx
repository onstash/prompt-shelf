import { TriangleAlert } from "lucide-react";
import { Fragment } from "react";
import type { ProposalDiff } from "@/lib/api";
import { cn } from "@/lib/utils";

type BodyLine = ProposalDiff["body"][number];
type FieldChange = ProposalDiff["fields"][number];
type MetadataChange = ProposalDiff["metadata"][number];

const LINE_CLASS: Record<BodyLine["kind"], string> = {
  same: "text-foreground/80",
  added: "bg-success-soft text-foreground",
  removed: "bg-destructive-soft text-foreground line-through decoration-destructive/70",
};

const LINE_MARK: Record<BodyLine["kind"], string> = { same: " ", added: "+", removed: "−" };
const LINE_LABEL: Record<BodyLine["kind"], string> = {
  same: "Unchanged",
  added: "Added",
  removed: "Removed",
};

const METADATA_LABEL: Record<MetadataChange["name"], string> = {
  title: "Title",
  description: "Description",
  category: "Category",
};

const FIELD_LABEL: Record<FieldChange["kind"], string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
};

/** One line of counts above the diff, so the scale of the change is clear before reading it. */
export function DiffSummary({
  body,
  addedTokens,
  removedTokens,
}: Pick<ProposalDiff, "body" | "addedTokens" | "removedTokens">) {
  const added = body.filter((line) => line.kind === "added").length;
  const removed = body.filter((line) => line.kind === "removed").length;
  const tokens = [
    ...addedTokens.map((token) => `added {{${token}}}`),
    ...removedTokens.map((token) => `removed {{${token}}}`),
  ];

  return (
    <p className="text-sm text-muted-foreground">
      {added} {added === 1 ? "line" : "lines"} added · {removed} {removed === 1 ? "line" : "lines"}{" "}
      removed
      {tokens.length ? ` · ${tokens.join(", ")}` : null}
    </p>
  );
}

/** Prompt text, line by line. Changes are shown by tint, a sign, and a strikethrough, and each line is labelled for screen readers. */
export function BodyDiff({ lines }: { lines: BodyLine[] }) {
  return (
    <ol
      aria-label="Prompt text changes"
      className="overflow-x-auto rounded-md border font-mono text-sm leading-6"
    >
      {lines.map((line, index) => (
        <li key={index} className={cn("grid grid-cols-[2.5rem_1fr] px-3", LINE_CLASS[line.kind])}>
          <span className="sr-only">{LINE_LABEL[line.kind]}: </span>
          <span aria-hidden="true" className="select-none text-muted-foreground tabular-nums">
            {LINE_MARK[line.kind]}
          </span>
          <span className="whitespace-pre-wrap break-words pr-4">{line.text || " "}</span>
        </li>
      ))}
    </ol>
  );
}

/** Title, description, and category, each shown as the old value and the new one. */
export function MetadataDiff({ changes }: { changes: MetadataChange[] }) {
  return (
    <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-4">
      {changes.map((change) => (
        <Fragment key={change.name}>
          <dt className="text-muted-foreground">{METADATA_LABEL[change.name]}</dt>
          <dd className="mb-3 flex min-w-0 flex-col gap-1 break-words sm:mb-0">
            <span className="rounded-sm bg-destructive-soft px-1.5 py-0.5 line-through decoration-destructive/70">
              <span className="sr-only">Was: </span>
              {change.from || "empty"}
            </span>
            <span className="rounded-sm bg-success-soft px-1.5 py-0.5">
              <span className="sr-only">Now: </span>
              {change.to || "empty"}
            </span>
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** Field additions, removals, and changes. Breaking changes carry a text label as well as a colour. */
export function FieldDiff({ changes }: { changes: FieldChange[] }) {
  return (
    <ul className="divide-y rounded-md border">
      {changes.map((change) => (
        <li
          key={`${change.kind}-${change.key}`}
          className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-mono font-medium break-all">{change.key}</p>
            {change.details.length ? (
              <p className="text-muted-foreground">{change.details.join(" · ")}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {change.breaking ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-destructive-soft px-2 py-0.5 text-destructive">
                <TriangleAlert className="size-3.5" aria-hidden="true" />
                Breaking
              </span>
            ) : null}
            <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground">
              {FIELD_LABEL[change.kind]}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
