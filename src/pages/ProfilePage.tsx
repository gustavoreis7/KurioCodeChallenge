import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Trash2 } from "lucide-react";
import { api } from "@/services/api";
import { useScope } from "@/hooks/useMarketplace";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { AccountLayout } from "@/components/AccountLayout";
import { Field, Failure, SummarySkeleton } from "@/components/Feedback";
import { Button } from "@/components/ui/button";
import { fieldErrors } from "@/services/http";
import type { ProfileUpdate, PasswordUpdate } from "@/types";
import { updateSessionUser } from "@/services/session";

export function ProfilePage() {
  const scope = useScope(),
    client = useQueryClient(),
    { announce } = useMarketplace();
  const profile = useQuery({
    queryKey: [...scope.key, "profile"],
    queryFn: ({ signal }) => api.profile(signal),
    enabled: scope.ready && !!scope.session,
  });
  const [avatar, setAvatar] = useState<string | null | undefined>(),
    [localError, setLocalError] = useState("");
  const save = useMutation({
    mutationFn: (input: ProfileUpdate) => api.updateProfile(input),
    onSuccess: (user) => {
      client.setQueryData([...scope.key, "profile"], user);
      updateSessionUser(user);
      setAvatar(undefined);
      announce("Perfil atualizado.");
    },
  });
  const password = useMutation({
    mutationFn: (input: PasswordUpdate) => api.password(input),
    onSuccess: () => {
      document.querySelector<HTMLFormElement>("#password-form")?.reset();
      announce("Senha atualizada.");
    },
  });
  const errors = fieldErrors(save.error),
    passwordErrors = fieldErrors(password.error);
  if (profile.isPending)
    return (
      <AccountLayout>
        <SummarySkeleton />
      </AccountLayout>
    );
  if (profile.isError)
    return (
      <AccountLayout>
        <Failure error={profile.error} retry={() => void profile.refetch()} />
      </AccountLayout>
    );
  const user = profile.data,
    image = avatar === undefined ? user.avatarUrl : avatar;
  return (
    <AccountLayout>
      <h1 className="page-heading">Perfil do colecionador</h1>
      <form
        key={user.version}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          save.mutate({
            name: String(data.get("profileName")),
            email: String(data.get("profileEmail")),
            username: String(data.get("profileUsername")),
            ens: String(data.get("profileEns")),
            ...(avatar !== undefined ? { avatarUrl: avatar } : {}),
          });
        }}
      >
        <div className="form-columns">
          <Field
            name="profileName"
            label="Nome de exibicao"
            required
            minLength={2}
            defaultValue={user.name}
            autoComplete="name"
            error={errors.name}
          />
          <Field
            name="profileUsername"
            label="Nome de usuario"
            defaultValue={user.username}
            pattern="[A-Za-z0-9_]{3,30}"
            error={errors.username}
          />
        </div>
        <div className="form-columns">
          <Field
            name="profileEmail"
            label="E-mail"
            required
            type="email"
            defaultValue={user.email}
            autoComplete="email"
            error={errors.email}
          />
          <Field
            name="profileEns"
            label="Nome ENS"
            defaultValue={user.ens}
            placeholder="nome.eth"
            pattern="[A-Za-z0-9-]+\.eth"
            error={errors.ens}
          />
        </div>
        <div className="avatar-field">
          <span>Avatar</span>
          {image ? (
            <img
              src={image}
              alt="Avatar do colecionador"
              width={56}
              height={56}
            />
          ) : (
            <div className="avatar-placeholder" aria-label="Sem avatar">
              {user.name[0]}
            </div>
          )}
          <label className="primary-link" htmlFor="avatar-upload">
            <ImagePlus size={14} />
            Alterar
          </label>
          <input
            id="avatar-upload"
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 2 * 1024 * 1024
              ) {
                setLocalError("Use uma imagem PNG, JPEG ou WebP de ate 2 MB.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                setAvatar(String(reader.result));
                setLocalError("");
              };
              reader.readAsDataURL(file);
            }}
          />
          <Button
            variant="ghost"
            type="button"
            onClick={() => setAvatar(null)}
            aria-label="Remover avatar"
          >
            <Trash2 size={14} />
            Remover
          </Button>
        </div>
        <Failure error={save.error} />
        <Button type="submit" disabled={save.isPending}>
          Salvar perfil
        </Button>
      </form>
      <form
        id="password-form"
        className="password-form"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (data.get("newPassword") !== data.get("repeatPassword")) {
            setLocalError("As senhas devem ser iguais.");
            document.getElementById("repeatPassword")?.focus();
            return;
          }
          setLocalError("");
          password.mutate({
            currentPassword: String(data.get("currentPassword")),
            newPassword: String(data.get("newPassword")),
          });
        }}
      >
        <h2>Alterar senha</h2>
        <Field
          name="currentPassword"
          label="Senha atual"
          type="password"
          required
          autoComplete="current-password"
          error={passwordErrors.currentPassword}
        />
        <Field
          name="newPassword"
          label="Nova senha"
          type="password"
          required
          minLength={8}
          pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}"
          autoComplete="new-password"
          error={passwordErrors.password}
        />
        <Field
          name="repeatPassword"
          label="Confirmar nova senha"
          type="password"
          required
          autoComplete="new-password"
        />
        <Failure error={password.error} />
        <Button type="submit" disabled={password.isPending}>
          Salvar senha
        </Button>
      </form>
      {localError && (
        <p role="alert" className="notice">
          {localError}
        </p>
      )}
    </AccountLayout>
  );
}
