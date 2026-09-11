import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { PageContainer } from "@/containers/page-container";
import { api } from "@/lib/api";
import { TemplateScreen } from "@/screens/template-screen";
import { WelcomeScreen } from "@/screens/welcome-screen";
import "./index.css";

function App() {
  const [screen, setScreen] = useState<"welcome" | "templates" | "create">("welcome");
  const templatesQuery = useQuery({ queryKey: ["templates"], queryFn: api.listTemplates });

  if (templatesQuery.isPending) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-7xl px-5 py-20 text-muted-foreground">
          Loading Prompt Shelf…
        </main>
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  if (templatesQuery.isError) {
    return (
      <PageContainer>
        <main className="mx-auto max-w-7xl px-5 py-20">
          <h1 className="text-2xl font-semibold">Could not load Prompt Shelf</h1>
          <p className="mt-2 text-muted-foreground">Start the local API, then refresh this page.</p>
        </main>
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  if (screen === "welcome") {
    return (
      <PageContainer>
        <WelcomeScreen
          onCreate={() => setScreen("create")}
          onExample={() => setScreen("templates")}
        />
        <Toaster position="bottom-center" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <TemplateScreen templates={templatesQuery.data} startCreating={screen === "create"} />
      <Toaster position="bottom-center" />
    </PageContainer>
  );
}

export default App;
