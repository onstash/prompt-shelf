import { Skeleton } from "@/components/ui/skeleton";

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
        {variant === "example" ? <Skeleton className="h-5 w-20" /> : null}
        <Skeleton className="h-11 w-3/4 max-w-lg" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-full max-w-2xl" />
          <Skeleton className="h-5 w-2/3 max-w-lg" />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <SkeletonPanel titleWidth="w-28" />
        <SkeletonPanel className="hidden lg:flex" titleWidth="w-36" />
      </div>
    </main>
  );
}

function SkeletonPanel({ className = "", titleWidth }: { className?: string; titleWidth: string }) {
  return (
    <section
      className={`h-[clamp(360px,55dvh,560px)] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className || "flex"}`}
    >
      <header className="flex h-16 shrink-0 items-center border-b border-border px-6">
        <Skeleton className={`h-5 ${titleWidth}`} />
      </header>
      <div className="space-y-4 p-6">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-8 h-9 w-32" />
      </div>
    </section>
  );
}
