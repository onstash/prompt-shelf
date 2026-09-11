import { Library, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Template } from "@/lib/api";

type PublicHeaderProps = {
  onCreateTemplate: () => void;
  onOpenShelf?: () => void;
  onSignOut?: () => void;
};

export function PublicHeader({ onCreateTemplate, onOpenShelf, onSignOut }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <a className="font-semibold tracking-[-.04em]" href="/">
          Prompt Shelf
        </a>
        <nav className="flex items-center gap-2">
          {onOpenShelf ? (
            <Button variant="ghost" size="sm" aria-label="My shelf" onClick={onOpenShelf}>
              <Library />
              <span className="hidden sm:inline">My shelf</span>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onCreateTemplate}>
            <Plus data-icon="inline-start" /> New template
          </Button>
          {onSignOut ? (
            <Button variant="ghost" size="sm" aria-label="Sign out" onClick={onSignOut}>
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

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
            <Button variant="ghost" size="sm" aria-label="Sign out" onClick={onSignOut}>
              <LogOut />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </nav>
        </div>
        <div className="pb-3 sm:hidden">{templateSelect(true)}</div>
      </div>
    </header>
  );
}
