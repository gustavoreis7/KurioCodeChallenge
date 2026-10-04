import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/AuthPage";
import { safeReturn } from "@/services/search";
export const Route = createFileRoute("/register")({
  validateSearch: (raw) => ({ redirect: safeReturn(raw.redirect) }),
  head: () => ({ meta: [{ title: "Criar conta | Kurio" }] }),
  component: () => <AuthPage register redirect={Route.useSearch().redirect} />,
});
