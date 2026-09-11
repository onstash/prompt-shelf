import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/sign-in")({ component: SignInRoute });

function SignInRoute() {
  return <App initialScreen="create" />;
}
