import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const textareaVariants = cva(
  "field-sizing-fixed w-full min-w-0 max-w-full rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      purpose: {
        answer: "min-h-24 resize-y",
        document:
          "h-[clamp(16rem,40dvh,28rem)] max-h-[28rem] resize-y overflow-y-auto font-mono text-base leading-7",
      },
    },
    defaultVariants: {
      purpose: "answer",
    },
  },
);

function Textarea({
  className,
  purpose,
  ...props
}: React.ComponentProps<"textarea"> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      data-purpose={purpose ?? "answer"}
      className={cn(textareaVariants({ purpose }), className)}
      {...props}
    />
  );
}

export { Textarea, textareaVariants };
