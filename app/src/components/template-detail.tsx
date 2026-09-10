import { Bookmark, FileText, History } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { Template } from "@/lib/api";
import { PromptPreview } from "@/components/prompt-preview";

type Values = { idea: string; audience: string; tone: string; length: string };
type Props = {
  template?: Template;
  loading: boolean;
  segments: Array<{ type: "static" | "value"; text: string; key?: string }>;
  values: Values;
  update: (key: keyof Values, value: string) => void;
  copied: boolean;
  onCopy: () => void;
  saved: boolean;
  onSavePreset: () => void;
};

export function TemplateDetail({
  template,
  loading,
  segments,
  values,
  update,
  copied,
  onCopy,
  saved,
  onSavePreset,
}: Props) {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-10 lg:py-14">
      <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
        <span>My shelf</span>
        <span>/</span>
        <span>Writing</span>
      </div>
      <section className="mb-9 max-w-3xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[.08em] text-blue-600">
          Writing template
        </div>
        <h1 className="text-4xl font-semibold tracking-[-.055em] sm:text-5xl">
          {loading ? "Loading template…" : (template?.title ?? "Clear first draft")}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Turn a rough idea into a clear, useful first draft without losing your own voice.
        </p>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <PromptPreview segments={segments} copied={copied} onCopy={onCopy} />
        <Card className="border-black/[.08] shadow-sm">
          <CardHeader className="border-b bg-white/60 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Customize</CardTitle>
              <span className="text-xs text-muted-foreground">
                {template?.fields.length ?? 4} fields
              </span>
            </div>
          </CardHeader>
          <CardContent className="bg-white px-6 py-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="idea">
                  What are you writing?{" "}
                  <span className="text-xs font-normal text-muted-foreground">Required</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  The rough idea or message you want to express.
                </p>
                <Textarea
                  id="idea"
                  value={values.idea}
                  onChange={(e) => update("idea", e.target.value)}
                  placeholder="e.g. An update about our product launch"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="audience">
                  Who is it for?{" "}
                  <span className="text-xs font-normal text-muted-foreground">Required</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Name the reader and what they already know.
                </p>
                <Input
                  id="audience"
                  value={values.audience}
                  onChange={(e) => update("audience", e.target.value)}
                  placeholder="e.g. Existing customers"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tone</Label>
                <Select value={values.tone} onValueChange={(v) => update("tone", v ?? "clear")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear">Clear and conversational</SelectItem>
                    <SelectItem value="warm">Warm and encouraging</SelectItem>
                    <SelectItem value="direct">Direct and confident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Length</Label>
                <Select value={values.length} onValueChange={(v) => update("length", v ?? "short")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short and skimmable</SelectItem>
                    <SelectItem value="medium">A few useful paragraphs</SelectItem>
                    <SelectItem value="long">Detailed and thorough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator className="my-6" />
            <div className="flex items-center justify-between gap-3">
              <span
                className={
                  values.idea.trim() && values.audience.trim()
                    ? "text-xs text-emerald-700"
                    : "text-xs text-muted-foreground"
                }
              >
                {values.idea.trim() && values.audience.trim()
                  ? "Ready to copy"
                  : "Start with the required fields"}
              </span>
              <Button variant="outline" onClick={onSavePreset}>
                <Bookmark data-icon="inline-start" />
                {saved ? "Saved" : "Save preset"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
        <History className="size-4" />
        Recent versions
        <Separator orientation="vertical" className="mx-1 h-4" />
        <FileText className="size-4" />
        Version 3 · today
      </div>
    </main>
  );
}
