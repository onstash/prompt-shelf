import { useMemo, useState } from "react";
import { Bookmark, Check, Copy, FileText, History, Plus } from "lucide-react";
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
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import "./index.css";

type Values = { idea: string; audience: string; tone: string; length: string };
const initial: Values = { idea: "", audience: "", tone: "clear", length: "short" };

function App() {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    body: "You are a thoughtful writing partner.\n\nCreate a {{idea}} for {{audience}} in a {{tone}} voice.",
  });
  const update = (key: keyof Values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const ready = values.idea.trim() !== "" && values.audience.trim() !== "";
  const tone = {
    clear: "clear and conversational",
    warm: "warm and encouraging",
    direct: "direct and confident",
  }[values.tone];
  const length = {
    short: "short and skimmable",
    medium: "a few useful paragraphs",
    long: "detailed and thorough",
  }[values.length];
  const prompt = useMemo(
    () =>
      `You are a thoughtful writing partner.\n\nCreate a ${values.idea || "[writing idea]"} for ${values.audience || "[intended audience]"} in a ${tone} voice. Keep it ${length} and easy to scan.\n\nStart with the clearest version of the idea, remove filler, and preserve the writer's intent. Do not invent facts or make the tone sound generic.`,
    [values, tone, length],
  );
  const copyPrompt = async () => {
    if (!ready) return toast.error("Add the two required details first");
    await navigator.clipboard?.writeText(prompt);
    setCopied(true);
    toast.success("Prompt copied");
    setTimeout(() => setCopied(false), 1800);
  };
  const saveTemplate = async () => {
    if (!draft.title.trim() || !draft.body.trim())
      return toast.error("Add a title and prompt body first");
    try {
      const response = await fetch("http://localhost:8787/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error("create failed");
      setCreating(false);
      toast.success("Template created");
    } catch {
      toast.error("Start the local API to create templates");
    }
  };
  const savePreset = () => {
    if (!ready) return toast.error("Complete the required fields first");
    setSaved(true);
    toast.success("Preset saved to your shelf");
  };
  return (
    <div className="min-h-screen bg-[#f8f8f6] text-[#202124]">
      <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-10">
          <a className="flex items-center gap-2 font-semibold tracking-[-.04em]" href="#">
            Prompt Shelf
          </a>
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-muted-foreground sm:inline-flex"
            >
              My shelf
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" /> New template
            </Button>
            <Button variant="ghost" size="icon" aria-label="Account">
              <span className="text-xs font-semibold">SV</span>
            </Button>
          </nav>
        </div>
      </header>
      {creating ? (
        <main className="mx-auto max-w-[760px] px-5 py-10 lg:py-14">
          <button className="mb-8 text-sm text-muted-foreground" onClick={() => setCreating(false)}>
            ← Back to shelf
          </button>
          <section className="mb-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[.08em] text-blue-600">
              New template
            </div>
            <h1 className="text-4xl font-semibold tracking-[-.055em]">Create something reusable</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Turn a workflow you repeat into a simple form.
            </p>
          </section>
          <Card className="overflow-hidden border-black/[.08] bg-white shadow-sm">
            <CardContent className="flex flex-col gap-6 px-6 py-7">
              <div className="flex flex-col gap-2">
                <Label htmlFor="template-title">Template name</Label>
                <Input
                  id="template-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="e.g. Clear first draft"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What will this help someone do?"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="template-body">Prompt instructions</Label>
                <p className="text-xs text-muted-foreground">
                  Use <code className="rounded bg-muted px-1.5 py-0.5">{"{{field_key}}"}</code>{" "}
                  where the form should add an answer.
                </p>
                <Textarea
                  id="template-body"
                  className="min-h-56 font-mono text-sm leading-7"
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
              </div>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCreating(false)}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate}>Create template</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      ) : (
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
              Clear first draft
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Turn a rough idea into a clear, useful first draft without losing your own voice.
            </p>
          </section>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
            <Card className="overflow-hidden border-black/[.08] shadow-sm">
              <CardHeader className="preview-header items-center justify-between border-b bg-white/60 px-6 py-4">
                <CardTitle className="text-base">Live prompt</CardTitle>
                <span className="text-xs text-muted-foreground">Version 3 · autosaved</span>
              </CardHeader>
              <CardContent className="bg-white px-6 py-7">
                <div className="min-h-[310px] whitespace-pre-wrap font-mono text-[14px] leading-8 text-[#45464a] sm:text-[15px]">
                  You are a thoughtful writing partner.{`\n\n`}Create a{" "}
                  <mark>{values.idea || "[writing idea]"}</mark> for{" "}
                  <mark>{values.audience || "[intended audience]"}</mark> in a <mark>{tone}</mark>{" "}
                  voice. Keep it <mark>{length}</mark> and easy to scan.{`\n\n`}Start with the
                  clearest version of the idea, remove filler, and preserve the writer's intent. Do
                  not invent facts or make the tone sound generic.
                </div>
              </CardContent>
              <div className="flex items-center justify-between gap-4 border-t bg-white px-6 py-4">
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Blue text comes from your answers
                </span>
                <Button onClick={copyPrompt} className="ml-auto">
                  {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                  {copied ? "Copied" : "Copy prompt"}
                </Button>
              </div>
            </Card>
            <Card className="border-black/[.08] shadow-sm">
              <CardHeader className="border-b bg-white/60 px-6 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Customize</CardTitle>
                  <span className="text-xs text-muted-foreground">4 fields</span>
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
                    <Select
                      value={values.length}
                      onValueChange={(v) => update("length", v ?? "short")}
                    >
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
                    className={ready ? "text-xs text-emerald-700" : "text-xs text-muted-foreground"}
                  >
                    {ready ? "Ready to copy" : "Start with the required fields"}
                  </span>
                  <Button variant="outline" onClick={savePreset}>
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
      )}
      <Toaster position="bottom-center" />
    </div>
  );
}
export default App;
