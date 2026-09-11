import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Template } from "@/lib/api";

type Props = {
  templates: Template[];
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onCreateTemplate: () => void;
  onSignOut: () => void;
};

export function Header({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateTemplate,
  onSignOut,
}: Props) {
  const templateSelect = (mobile: boolean) => (
    <Select value={selectedTemplateId} onValueChange={(value) => value && onSelectTemplate(value)}>
      <SelectTrigger className={mobile ? "w-full sm:hidden" : "hidden w-auto sm:inline-flex"}>
        <SelectValue placeholder="Select template" />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            {template.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex h-16 items-center justify-between">
          <a className="font-semibold tracking-[-.04em]" href="#">
            Prompt Shelf
          </a>
          <nav className="flex items-center gap-2">
            {templateSelect(false)}
            <Button variant="outline" size="sm" onClick={onCreateTemplate}>
              <Plus data-icon="inline-start" /> New template
            </Button>
            <Button
              className="hidden sm:inline-flex"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <span className="text-xs font-semibold">SV</span>
            </Button>
          </nav>
        </div>
        <div className="pb-3 sm:hidden">{templateSelect(true)}</div>
      </div>
    </header>
  );
}
