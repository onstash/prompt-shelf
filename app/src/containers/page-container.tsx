import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh] bg-background text-foreground">{children}</div>;
}
