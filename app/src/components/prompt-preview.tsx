import type { ReactNode } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
  WorkspaceCard,
  WorkspaceCardContent,
  WorkspaceCardHeader,
} from "@/components/ui/workspace-card";

type Segment = { type: "static" | "value"; text: string; key?: string };
type Props = {
  segments: Segment[];
  copied: boolean;
  onCopy: () => void;
  onEdit?: () => void;
  revisionLabel: string;
  children?: ReactNode;
};

export function PromptPreview({
  segments,
  copied,
  onCopy,
  onEdit,
  revisionLabel,
  children,
}: Props) {
  return (
    <WorkspaceCard>
      <WorkspaceCardHeader>
        <CardTitle>Live prompt</CardTitle>
        <span className="text-xs text-muted-foreground">{revisionLabel}</span>
      </WorkspaceCardHeader>
      <WorkspaceCardContent>
        <div className="min-w-0 whitespace-pre-wrap break-words font-mono text-[14px] leading-8 text-card-foreground [overflow-wrap:anywhere] sm:text-[15px]">
          {segments.length > 0
            ? segments.map((segment, index) =>
                segment.type === "value" ? (
                  <mark key={`${segment.key ?? "value"}-${index}`}>{segment.text}</mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )
            : null}
        </div>
      </WorkspaceCardContent>
      <div className="flex flex-wrap items-center gap-3 border-t bg-card px-4 py-4 sm:px-6">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Blue text comes from your answers
        </span>
        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          {children}
          {onEdit ? (
            <Button variant="outline" aria-label="Edit template" onClick={onEdit}>
              <Pencil />
              Edit Template
            </Button>
          ) : null}
          <Button onClick={onCopy}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </div>
    </WorkspaceCard>
  );
}
