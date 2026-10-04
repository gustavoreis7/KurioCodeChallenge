import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "@/services/api";
import { sessionState } from "@/services/session";
import type { Session, SocialProvider } from "@/types";
import { Failure } from "./Feedback";
import { Button } from "./ui/button";

export function SocialSignIn({
  provider,
  onCancel,
  onSuccess,
}: {
  provider: SocialProvider;
  onCancel: () => void;
  onSuccess: (session: Session, revision: number) => Promise<void>;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    title.current?.focus();
    return () => {
      active.current = false;
      request.current?.abort();
    };
  }, []);
  const accounts = useQuery({
    queryKey: ["auth", "social", provider],
    queryFn: ({ signal }) => api.socialAccounts(provider, signal),
  });
  const login = useMutation({
    mutationFn: async (accountId: string) => {
      const revision = sessionState().revision;
      request.current = new AbortController();
      const session = await api.socialLogin(
        provider,
        { accountId },
        request.current.signal,
      );
      return { session, revision };
    },
    onSuccess: async ({ session, revision }) => {
      if (!active.current || revision !== sessionState().revision) return;
      await onSuccess(session, revision);
    },
  });
  return (
    <section className="social-account-picker" aria-busy={login.isPending}>
      <h2 ref={title} tabIndex={-1}>
        Continuar com {provider === "google" ? "Google" : "Facebook"}
      </h2>
      <p className="social-demo-notice">
        Autenticacao simulada. Escolha uma conta de demonstracao.
      </p>
      <div className="social-account-list">
        {accounts.isPending && (
          <div aria-label="Carregando contas" role="status">
            <div className="social-account-placeholder shimmer" />
            <div className="social-account-placeholder shimmer" />
          </div>
        )}
        <Failure error={accounts.error} retry={() => void accounts.refetch()} />
        {accounts.data?.accounts.map((account) => (
          <Button
            key={account.id}
            variant="outline"
            className="social-account-option"
            disabled={login.isPending}
            onClick={() => login.mutate(account.id)}
          >
            <UserRound size={20} aria-hidden="true" />
            <span>
              <strong>{account.name}</strong>
              <span>{account.email}</span>
            </span>
          </Button>
        ))}
      </div>
      <Failure error={login.error} />
      <p className="social-login-status" role="status">
        {login.isPending ? "Entrando..." : ""}
      </p>
      <Button variant="ghost" onClick={onCancel}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar
      </Button>
    </section>
  );
}
