import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";

export function AuthScreen() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const signInStarted = useRef(false);

  async function signIn() {
    if (signInStarted.current) return;
    signInStarted.current = true;
    setPending(true);
    setError("");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.href,
    });
    if (result?.error) {
      setError(result.error.message ?? "Google sign-in failed");
      signInStarted.current = false;
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-sm items-center px-5 py-12">
      <div className="w-full space-y-6">
        <div>
          <p className="text-sm font-semibold">Prompt Shelf</p>
          <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em]">Welcome</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Sign in to keep your prompt templates private and available across devices.
          </p>
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full text-md" size="lg" disabled={pending} onClick={signIn}>
          {pending ? "Opening Google…" : "Continue with Google"}
        </Button>
      </div>
    </main>
  );
}
