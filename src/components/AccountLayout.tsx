import { Link } from "@tanstack/react-router";
import { UserRound, Wallet, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="account-layout">
      <nav className="account-sidebar" aria-label="Meu perfil">
        <h2>Meu perfil</h2>
        <Link to="/profile">
          <UserRound size={14} />
          Dados do perfil
        </Link>
        <Link to="/wallets">
          <Wallet size={14} />
          Carteiras
        </Link>
        <Link to="/orders">
          <ShoppingBag size={14} />
          Pedidos
        </Link>
      </nav>
      <div className="account-content">{children}</div>
    </div>
  );
}
