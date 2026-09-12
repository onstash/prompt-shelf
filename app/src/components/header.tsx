import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PanelLeft } from "lucide-react";
import { TemplateNavigation } from "@/components/template-navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  const [templatesOpen, setTemplatesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5">
        <div className="flex h-16 items-center gap-2">
          <nav aria-label="Shelf navigation" className="lg:hidden">
            <Sheet open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="lg:hidden"
                    aria-label="Open templates"
                  />
                }
              >
                <PanelLeft />
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader className="sr-only">
                  <SheetTitle>My shelf</SheetTitle>
                  <SheetDescription>Choose a template or manage your shelf.</SheetDescription>
                </SheetHeader>
                <TemplateNavigation
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  className="p-3 pt-5"
                  onSelectTemplate={(id) => {
                    setTemplatesOpen(false);
                    onSelectTemplate(id);
                  }}
                  onCreateTemplate={() => {
                    setTemplatesOpen(false);
                    onCreateTemplate();
                  }}
                  onSignOut={() => {
                    setTemplatesOpen(false);
                    onSignOut();
                  }}
                />
              </SheetContent>
            </Sheet>
          </nav>
          <Link className="font-semibold tracking-[-.04em]" to="/">
            Prompt Shelf
          </Link>
        </div>
      </div>
    </header>
  );
}
