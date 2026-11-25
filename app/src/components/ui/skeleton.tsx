import { cn } from "@/lib/utils";

const shapes = {
  badge: "h-5 w-20",
  title: "h-11 w-3/4 max-w-lg",
  description: "h-5 w-full max-w-2xl",
  descriptionEnd: "h-5 w-2/3 max-w-lg",
  previewHeading: "h-5 w-28",
  customizeHeading: "h-5 w-36",
  line: "h-4 w-full",
  lineLong: "h-4 w-11/12",
  lineShort: "h-4 w-4/5",
  action: "mt-8 h-9 w-32",
};

function Skeleton({
  className,
  shape,
  ...props
}: React.ComponentProps<"div"> & { shape?: keyof typeof shapes }) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", shape && shapes[shape], className)}
      {...props}
    />
  );
}

export { Skeleton };
