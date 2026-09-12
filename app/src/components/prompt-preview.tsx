import type { ReactNode } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className="flex h-[clamp(360px,55dvh,560px)] min-w-0 max-w-full flex-col overflow-hidden border-black/[.08] shadow-sm">
      <CardHeader className="preview-header items-center justify-between border-b bg-white/60 px-6 py-4">
        <CardTitle className="text-base">Live prompt</CardTitle>
        <span className="text-xs text-muted-foreground">{revisionLabel}</span>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-7">
        <div className="min-w-0 whitespace-pre-wrap break-words font-mono text-[14px] leading-8 text-[#45464a] [overflow-wrap:anywhere] sm:text-[15px] py-3">
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
      </CardContent>
      <div className="flex flex-wrap items-center gap-3 border-t bg-white px-4 py-4 sm:px-6">
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
    </Card>
  );
}
