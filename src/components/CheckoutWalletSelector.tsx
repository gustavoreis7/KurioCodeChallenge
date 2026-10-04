import { Wallet as WalletIcon } from "lucide-react";
import type { Wallet } from "@/types";
import { walletProviders } from "@/services/wallet-options";

export function CheckoutWalletSelector({
  wallets,
  selectedId,
  disabled,
  onSelect,
}: {
  wallets: Wallet[];
  selectedId?: string;
  disabled: boolean;
  onSelect: (wallet: Wallet) => void;
}) {
  return (
    <fieldset className="mobile-wallet-selector checkout-wallet-selector">
      <legend>Carteira e rede</legend>
      {wallets.map((wallet) => {
        const provider = walletProviders.find(
          (item) => item.id === wallet.provider,
        )?.label;
        return (
          <label
            className={`mobile-wallet-option ${wallet.id === selectedId ? "wallet-selected" : ""}`}
            key={wallet.id}
          >
            <input
              type="radio"
              name="payment-wallet"
              checked={wallet.id === selectedId}
              disabled={disabled}
              onChange={() => onSelect(wallet)}
              aria-label={`${provider ? `${provider} · ` : ""}${wallet.name} · ${wallet.network}`}
            />
            <WalletIcon size={20} aria-hidden="true" />
            <span>
              <strong className="wallet-provider">
                {provider ?? wallet.name}
              </strong>
              <strong className="wallet-name">
                {wallet.name}
                {wallet.isPrimary && wallet.name.toLowerCase() !== "principal"
                  ? " · Principal"
                  : ""}
              </strong>
              <small title={wallet.address}>{wallet.address}</small>
              <small>
                {wallet.network === "ethereum" ? "Ethereum" : "Polygon"}
              </small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
