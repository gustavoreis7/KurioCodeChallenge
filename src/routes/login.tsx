import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";
import { safeReturn } from "@/services/search";
export const Route = createFileRoute("/login")({
  validateSearch: (raw) => ({ redirect: safeReturn(raw.redirect) }),
  head: () => ({ meta: [{ title: "Entrar | Kurio" }] }),
  component: () => <AuthPage redirect={Route.useSearch().redirect} />,
});
