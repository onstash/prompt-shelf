import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function TemplateDetailSkeleton({
  variant = "template",
}: {
  variant?: "template" | "example";
}) {
  return (
    <main
      className="mx-auto w-full max-w-7xl px-5 py-10"
      aria-busy="true"
      aria-label="Loading template"
    >
      <section className="mb-9 flex max-w-3xl flex-col gap-4">
        {variant === "example" ? <Skeleton shape="badge" /> : null}
        <Skeleton shape="title" />
        <div className="space-y-2">
          <Skeleton shape="description" />
          <Skeleton shape="descriptionEnd" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <SkeletonPanel kind="preview" />
        <SkeletonPanel kind="customize" />
      </div>
    </main>
  );
}

function SkeletonPanel({ kind }: { kind: "preview" | "customize" }) {
  return (
    <section
      className={cn(
        "h-[clamp(360px,55dvh,560px)] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        kind === "preview" ? "flex" : "hidden lg:flex",
      )}
    >
      <header className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <Skeleton shape={kind === "customize" ? "customizeHeading" : "previewHeading"} />
      </header>
      <div className="space-y-4 p-6">
        <Skeleton shape="line" />
        <Skeleton shape="lineLong" />
        <Skeleton shape="lineShort" />
        <Skeleton shape="action" />
      </div>
    </section>
  );
}
