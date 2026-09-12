import { Link } from "@tanstack/react-router";
import { Library, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onCreateTemplate: () => void;
  onOpenShelf?: () => void;
  onSignOut?: () => void;
};

export function PublicHeader({ onCreateTemplate, onOpenShelf, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link className="font-semibold tracking-[-.04em]" to="/">
          Prompt Shelf
        </Link>
        <nav className="flex items-center gap-2">
          {onOpenShelf ? (
            <Button variant="ghost" size="lg" aria-label="My shelf" onClick={onOpenShelf}>
              <Library />
              <span className="hidden sm:inline">My shelf</span>
            </Button>
          ) : null}
          <Button variant="outline" size="lg" onClick={onCreateTemplate}>
            <Plus data-icon="inline-start" /> New template
          </Button>
          {onSignOut ? (
            <Button variant="ghost" size="lg" aria-label="Sign out" onClick={onSignOut}>
              <LogOut />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
