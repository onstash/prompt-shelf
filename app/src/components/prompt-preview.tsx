import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Segment = { type: "static" | "value"; text: string; key?: string };
type Props = { segments: Segment[]; copied: boolean; onCopy: () => void };

export function PromptPreview({ segments, copied, onCopy }: Props) {
  return (
    <Card className="overflow-hidden border-black/[.08] shadow-sm">
      <CardHeader className="preview-header items-center justify-between border-b bg-white/60 px-6 py-4">
        <CardTitle className="text-base">Live prompt</CardTitle>
        <span className="text-xs text-muted-foreground">Version 3 · autosaved</span>
      </CardHeader>
      <CardContent className="bg-white px-6 py-7">
        <div className="min-h-[310px] whitespace-pre-wrap font-mono text-[14px] leading-8 text-[#45464a] sm:text-[15px]">
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
      <div className="flex items-center justify-between gap-4 border-t bg-white px-6 py-4">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Blue text comes from your answers
        </span>
        <Button onClick={onCopy} className="ml-auto">
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
      </div>
    </Card>
  );
}
