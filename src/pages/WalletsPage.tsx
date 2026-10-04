import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useScope, useWallets } from "@/hooks/useMarketplace";
import { api } from "@/services/api";
import type { Network, Wallet, WalletInput, WalletProvider } from "@/types";
import { AccountLayout } from "@/components/AccountLayout";
import { Field, Failure, SummarySkeleton } from "@/components/Feedback";
import { Button } from "@/components/ui/button";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { fieldErrors } from "@/services/http";
import { walletProviders } from "@/services/wallet-options";

function WalletForm({
  wallet,
  primary,
  onSaved,
}: {
  wallet?: Wallet;
  primary: boolean;
  onSaved?: () => void;
}) {
  const scope = useScope(),
    client = useQueryClient(),
    { announce } = useMarketplace();
  const mutation = useMutation({
    mutationFn: (input: WalletInput) => api.saveWallet(input, wallet?.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: [...scope.key, "wallets"] });
      announce("Carteira salva.");
      onSaved?.();
    },
  });
  const prefix = wallet?.id ?? "new",
    errors = fieldErrors(mutation.error);
  return (
    <section className="wallet-form">
      <h2>Carteira {primary ? "principal" : "secundaria"}</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          mutation.mutate({
            name: String(data.get(`${prefix}-name`)),
            address: String(data.get(`${prefix}-address`)),
            network: String(data.get(`${prefix}-network`)) as Network,
            isPrimary: primary || data.get(`${prefix}-primary`) === "on",
            provider: String(data.get(`${prefix}-provider`)) as WalletProvider,
          });
        }}
      >
        <Field
          name={`${prefix}-name`}
          label="Apelido da carteira"
          required
          minLength={2}
          defaultValue={wallet?.name}
          error={errors.name}
        />
        <div className="form-field">
          <label htmlFor={`${prefix}-network`}>Rede</label>
          <select
            id={`${prefix}-network`}
            name={`${prefix}-network`}
            defaultValue={wallet?.network ?? "ethereum"}
          >
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>
        <Field
          name={`${prefix}-address`}
          label="Endereco da carteira"
          required
          defaultValue={wallet?.address}
          placeholder="0x…"
          pattern="0x[0-9a-fA-F]{40}"
          error={errors.address}
        />
        <div className="form-field">
          <label htmlFor={`${prefix}-provider`}>Tipo de carteira</label>
          <select
            id={`${prefix}-provider`}
            name={`${prefix}-provider`}
            defaultValue={wallet?.provider ?? "metamask"}
            aria-invalid={!!errors.provider}
            aria-describedby={
              errors.provider ? `${prefix}-provider-error` : undefined
            }
          >
            {walletProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
          {errors.provider && (
            <p id={`${prefix}-provider-error`} className="field-error">
              {errors.provider}
            </p>
          )}
        </div>
        {!primary && (
          <label className="check-row">
            <input type="checkbox" name={`${prefix}-primary`} />
            Definir como principal
          </label>
        )}
        <Failure error={mutation.error} />
        <Button type="submit" disabled={mutation.isPending}>
          Salvar carteira
        </Button>
      </form>
    </section>
  );
}
export function WalletsPage() {
  const wallets = useWallets(),
    [adding, setAdding] = useState(false);
  return (
    <AccountLayout>
      <h1 className="page-heading">Carteiras</h1>
      {wallets.isPending ? (
        <SummarySkeleton />
      ) : wallets.isError ? (
        <Failure error={wallets.error} retry={() => void wallets.refetch()} />
      ) : (
        <>
          {[...wallets.data.items]
            .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
            .map((wallet) => (
              <WalletForm
                key={`${wallet.id}:${wallet.version}`}
                wallet={wallet}
                primary={wallet.isPrimary}
              />
            ))}
          {wallets.data.items.length < 2 &&
            (adding || !wallets.data.items.length ? (
              <WalletForm
                primary={!wallets.data.items.length}
                onSaved={() => setAdding(false)}
              />
            ) : (
              <Button variant="outline" onClick={() => setAdding(true)}>
                <Plus size={16} />
                Adicionar carteira secundaria
              </Button>
            ))}
        </>
      )}
    </AccountLayout>
  );
}
