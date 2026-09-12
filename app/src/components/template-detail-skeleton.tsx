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
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-7 w-full max-w-2xl" />
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <Skeleton className="h-[clamp(360px,55dvh,560px)] w-full" />
        <Skeleton className="h-[clamp(360px,55dvh,560px)] w-full" />
      </div>
    </main>
  );
}
