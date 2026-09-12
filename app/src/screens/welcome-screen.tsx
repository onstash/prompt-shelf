import { Button } from "@/components/ui/button";

type WelcomeScreenProps = {
  onCreate: () => void;
  onExample: () => void;
  onOpenShelf: () => void;
  audience?: "new" | "returning";
};

export function WelcomeScreen({
  onCreate,
  onExample,
  onOpenShelf,
  audience = "new",
}: WelcomeScreenProps) {
  const returning = audience === "returning";

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-[-.06em] sm:text-6xl">
          {returning
            ? "Your reusable workflows are ready."
            : "Turn repeatable thinking into reusable workflows."}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          {returning
            ? "Open your shelf to customize a template, preview the result, and copy it into any AI tool."
            : "Create prompt templates with variables, fill them in when you need them, and copy a clear result to any AI tool."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={returning ? onOpenShelf : onCreate} size="lg">
            {returning ? "Open my shelf" : "Create your first template"}
          </Button>
          <Button variant="outline" size="lg" onClick={returning ? onCreate : onExample}>
            {returning ? "New template" : "Explore an example"}
          </Button>
        </div>
      </div>
      <div className="mt-20 grid gap-4 sm:grid-cols-3">
        {[
          ["01", "Write once", "Capture a workflow you repeat."],
          ["02", "Add variables", "Use {{fields}} to make it adaptable."],
          ["03", "Run anywhere", "Fill it in and copy the finished prompt."],
        ].map(([number, title, description]) => (
          <div key={number} className="border-t border-black/[.12] pt-4">
            <p className="text-xs font-semibold text-muted-foreground">{number}</p>
            <h2 className="mt-8 font-semibold">{title}</h2>
            <span className="mt-2 text-sm leading-6 text-muted-foreground">{description}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
