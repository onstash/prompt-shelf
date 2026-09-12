import { Link } from "@tanstack/react-router";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/[.07] bg-[#f8f8f6]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link className="font-semibold tracking-[-.04em]" to="/">
          Prompt Shelf
        </Link>
      </div>
    </header>
  );
}
