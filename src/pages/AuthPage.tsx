import { Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Facebook } from "lucide-react";
import { api } from "@/services/api";
import { sessionState, setSession, useSession } from "@/services/session";
import { fieldErrors } from "@/services/http";
import { catalogSearch, safeReturn } from "@/services/search";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Failure } from "@/components/Feedback";
import { CatalogPage } from "./CatalogPage";
import { SocialSignIn } from "@/components/SocialSignIn";
import type { Registration, Session, SocialProvider } from "@/types";

export function AuthPage({
  register = false,
  redirect,
}: {
  register?: boolean;
  redirect: string;
}) {
  const router = useRouter(),
    [visible, setVisible] = useState(false),
    [confirmationError, setConfirmationError] = useState(""),
    [provider, setProvider] = useState<SocialProvider | null>(null);
  const { ready } = useSession();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const completeLogin = async (session: Session, revision: number) => {
    if (!active.current || revision !== sessionState().revision) return;
    setSession(session);
    await router.navigate({ href: safeReturn(redirect) });
  };
  const mutation = useMutation({
    mutationFn: async (input: Registration) => {
      const revision = sessionState().revision;
      const session = await (register ? api.register(input) : api.login(input));
      return { session, revision };
    },
    onSuccess: ({ session, revision }) => completeLogin(session, revision),
  });
  const errors = fieldErrors(mutation.error);
  return (
    <>
      <CatalogPage search={catalogSearch({})} />
      <Modal
        open
        onClose={() => void router.navigate({ to: "/" })}
        title={register ? "Criar conta" : "Entrar"}
        description={
          register
            ? "Crie seu perfil de colecionador e encontre sua proxima obra."
            : "Entre para acompanhar suas colecoes e seu perfil."
        }
        className="auth-modal"
      >
        <Link to="/" className="auth-brand" aria-label="Kurio, inicio">
          KURIO
        </Link>
        {provider ? (
          <SocialSignIn
            key={provider}
            provider={provider}
            onSuccess={completeLogin}
            onCancel={() => {
              setProvider(null);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLButtonElement>(
                    `[data-social-provider="${provider}"]`,
                  )
                  ?.focus(),
              );
            }}
          />
        ) : (
          <>
            <h2 className="auth-mobile-title">
              {register ? "Criar perfil de colecionador" : "Entrar"}
            </h2>
            <nav aria-label="Autenticacao" className="auth-tabs">
              <Link to="/login" search={{ redirect }}>
                Entrar
              </Link>
              <span aria-hidden="true">|</span>
              <Link to="/register" search={{ redirect }}>
                Criar conta
              </Link>
            </nav>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (mutation.isPending || !ready) return;
                const data = new FormData(event.currentTarget),
                  password = String(data.get("password"));
                if (register && password !== data.get("confirmPassword")) {
                  setConfirmationError("As senhas devem ser iguais.");
                  document.getElementById("confirmPassword")?.focus();
                  return;
                }
                setConfirmationError("");
                mutation.mutate({
                  name: String(data.get("name") ?? ""),
                  username: register
                    ? String(data.get("username") ?? "")
                    : undefined,
                  email: String(data.get("email")),
                  password,
                });
              }}
            >
              {register && (
                <Field
                  label="Nome de exibicao"
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  error={errors.name}
                  placeholder="Nome de exibicao"
                />
              )}
              {register && (
                <Field
                  label="Nome de usuario"
                  name="username"
                  required
                  pattern="[A-Za-z0-9_]{3,30}"
                  autoComplete="username"
                  error={errors.username}
                  placeholder="Nome de usuario"
                />
              )}
              <Field
                label="E-mail"
                name="email"
                type="email"
                required
                autoComplete="email"
                error={errors.email}
                placeholder="Digite seu e-mail"
              />
              <div className="password-field">
                <Field
                  label="Senha"
                  name="password"
                  type={visible ? "text" : "password"}
                  required
                  minLength={register ? 8 : 1}
                  pattern={
                    register ? "(?=.*[A-Za-z])(?=.*[0-9]).{8,}" : undefined
                  }
                  title={
                    register
                      ? "Pelo menos 8 caracteres, uma letra e um numero"
                      : undefined
                  }
                  autoComplete={register ? "new-password" : "current-password"}
                  error={errors.password}
                  placeholder="Senha"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
              {register && (
                <Field
                  label="Confirmar senha"
                  name="confirmPassword"
                  type={visible ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  error={confirmationError}
                  placeholder="Confirmar senha"
                />
              )}
              {!register && (
                <button
                  className="forgot-password"
                  type="button"
                  disabled
                  title="Recuperacao de senha indisponivel nesta simulacao"
                >
                  Esqueceu a senha?
                </button>
              )}
              <Failure error={mutation.error} />
              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending || !ready}
              >
                {mutation.isPending
                  ? "Aguarde…"
                  : register
                    ? "Criar conta"
                    : "Entrar"}
              </Button>
            </form>
            <div className="social-auth">
              <p>Ou continue com</p>
              <Button
                variant="outline"
                data-social-provider="google"
                disabled={mutation.isPending || !ready}
                onClick={() => setProvider("google")}
              >
                <span className="google-symbol" aria-hidden="true">
                  G
                </span>
                Continuar com Google
              </Button>
              <Button
                variant="outline"
                data-social-provider="facebook"
                disabled={mutation.isPending || !ready}
                onClick={() => setProvider("facebook")}
              >
                <Facebook size={18} aria-hidden="true" />
                Continuar com Facebook
              </Button>
            </div>
            <Link
              className="auth-switch"
              to={register ? "/login" : "/register"}
              search={{ redirect }}
            >
              {register
                ? "Ja tem uma conta? Entre"
                : "Novo na Kurio? Crie uma conta"}
            </Link>
          </>
        )}
      </Modal>
    </>
  );
}
