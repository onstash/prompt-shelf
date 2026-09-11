import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f8f8f6] text-[#202124]">{children}</div>;
}
