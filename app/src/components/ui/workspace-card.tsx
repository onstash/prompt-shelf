import type { ComponentProps } from "react";

export function WorkspaceCard({
  kind = "preview",
  ...props
}: ComponentProps<"div"> & { kind?: "preview" | "customize" }) {
  return (
    <div
      data-slot="card"
      className={
        kind === "preview"
          ? "flex h-(--workspace-card-height) min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
          : "hidden h-(--workspace-card-height) min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm lg:flex"
      }
      {...props}
    />
  );
}

export function WorkspaceCardHeader(props: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className="preview-header items-center justify-between border-b bg-card px-6 py-4"
      {...props}
    />
  );
}

export function WorkspaceCardContent(props: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className="min-h-0 flex-1 overflow-y-auto bg-card px-6 py-6"
      {...props}
    />
  );
}
