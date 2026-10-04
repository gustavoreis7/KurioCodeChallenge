import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  Wallet,
  X,
  ChevronLeft,
  Heart,
  House,
  ScanLine,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/useMarketplace";
import { api } from "@/services/api";
import { setSession, useSession } from "@/services/session";
import { errorMessage } from "@/services/http";
import { useMarketplace } from "./MarketplaceProvider";
import { Button } from "./ui/button";
import { catalogSearch } from "@/services/search";
import { FavoritesPanel } from "./FavoritesPanel";

export function Header() {
  const { session, ready } = useSession(),
    cart = useCart(),
    router = useRouter();
  const { openCart, announce, filtersOpen, openFilters, openSearch } =
    useMarketplace();
  const location = useRouterState({ select: (state) => state.location });
  const homeActive = location.pathname === "/" && location.hash !== "catalogo";
  const marketActive =
    location.hash === "catalogo" ||
    /^\/(nfts|cart|checkout|orders)(\/|$)/.test(location.pathname);
  const [menu, setMenu] = useState(false);
  const [favoritesToken, setFavoritesToken] = useState<string | null>(null);
  const view = location.pathname.split("/")[1] || "home";
  const mobileTitle =
    (
      {
        cart: "Carrinho de NFTs",
        checkout: "Pagamento com carteira",
        profile: "Meu perfil",
        wallets: "Carteiras",
        orders: "Meus pedidos",
      } as Record<string, string>
    )[view] ?? "";
  const count =
    cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const logout = async () => {
    const token = session?.token;
    setSession(null, true);
    setMenu(false);
    await router.navigate({ to: "/" });
    if (token)
      try {
        await api.logout(token);
      } catch (error) {
        announce(errorMessage(error));
      }
  };
  return (
    <header className="site-header" data-view={view}>
      <form
        className="mobile-search"
        role="search"
        key={String(location.search.q ?? "")}
        onSubmit={(event) => {
          event.preventDefault();
          const q = String(new FormData(event.currentTarget).get("q") ?? "");
          void router.navigate({
            to: "/",
            search: (previous) => ({ ...catalogSearch(previous), q, page: 1 }),
            hash: "catalogo",
          });
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Buscar"
          disabled={!ready}
        >
          <Search size={20} />
        </Button>
        <input
          id="mobile-catalog-search"
          name="q"
          type="search"
          aria-label="Buscar NFTs"
          placeholder="Explorar coleções"
          defaultValue={String(location.search.q ?? "")}
          disabled={!ready}
        />
      </form>
      <Button
        className="mobile-filter-trigger"
        size="icon"
        aria-label="Filtros"
        title="Filtros"
        aria-expanded={filtersOpen}
        disabled={!ready}
        onClick={() => openFilters(!filtersOpen)}
      >
        <SlidersHorizontal size={20} />
      </Button>
      <div className="mobile-page-heading">
        <Link
          to={view === "checkout" ? "/cart" : "/"}
          hash={view === "checkout" ? undefined : "catalogo"}
          className="mobile-back"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
        <h2>{mobileTitle}</h2>
      </div>
      <Link to="/" className="brand" aria-label="Kurio, inicio">
        KURIO
      </Link>
      <nav aria-label="Navegacao principal" className="desktop-nav">
        <Link
          to="/"
          activeOptions={{ exact: true, includeHash: true }}
          data-nav-active={homeActive}
        >
          Início
        </Link>
        <Link
          to="/"
          hash="catalogo"
          activeOptions={{ exact: true, includeHash: true }}
          data-nav-active={marketActive}
        >
          Mercado
        </Link>
        <button
          onClick={() =>
            announce("A pagina de criadores nao faz parte desta demonstracao.")
          }
        >
          Criadores
        </button>
        <button
          onClick={() =>
            announce("O conteudo editorial nao faz parte desta demonstracao.")
          }
        >
          Aprenda
        </button>
      </nav>
      <div className="header-actions">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Buscar NFTs"
          title="Buscar NFTs"
          onClick={async () => {
            openSearch(true);
            await router.navigate({
              to: "/",
              search: (previous) => catalogSearch(previous),
              hash: "catalogo",
            });
            requestAnimationFrame(() =>
              document.getElementById("catalog-search")?.focus(),
            );
          }}
        >
          <Search aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Abrir carrinho com ${count} itens`}
          title="Carrinho"
          onClick={() => openCart(true)}
          className="relative"
        >
          <ShoppingCart aria-hidden="true" />
          {count > 0 && <span className="cart-count">{count}</span>}
        </Button>
        {session ? (
          <Button
            variant="outline"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-controls="account-menu"
            aria-label={session.user.name.split(" ")[0]}
            title={`Conta de ${session.user.name}`}
          >
            <UserRound aria-hidden="true" />
            <span className="account-name">
              {session.user.name.split(" ")[0]}
            </span>
          </Button>
        ) : (
          <Link
            to="/login"
            search={{ redirect: router.state.location.href }}
            data-login-trigger
            className="primary-link"
            aria-disabled={!ready}
          >
            <LogIn size={20} aria-hidden="true" />
            Entrar
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="mobile-nav"
          aria-label={menu ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>
      {menu && (
        <nav
          id="account-menu"
          aria-label="Menu da conta"
          className="account-menu"
        >
          <Link to="/" onClick={() => setMenu(false)}>
            Mercado
          </Link>
          {session ? (
            <>
              <Link to="/profile" onClick={() => setMenu(false)}>
                <UserRound size={14} />
                Meu perfil
              </Link>
              <Link to="/wallets" onClick={() => setMenu(false)}>
                <Wallet size={14} />
                Carteiras
              </Link>
              <Link to="/orders" onClick={() => setMenu(false)}>
                Meus pedidos
              </Link>
              <Button variant="ghost" onClick={logout}>
                <LogOut size={14} />
                Sair
              </Button>
            </>
          ) : (
            <Link
              to="/register"
              search={{ redirect: "/" }}
              onClick={() => setMenu(false)}
            >
              Criar conta
            </Link>
          )}
        </nav>
      )}
      <nav className="mobile-bottom-nav" aria-label="Navegacao mobile">
        <Link
          to="/"
          aria-label="Inicio"
          aria-current={view === "home" ? "page" : undefined}
          title="Inicio"
        >
          <House size={21} fill={view === "home" ? "currentColor" : "none"} />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Favoritos"
          title="Favoritos"
          onClick={() =>
            session
              ? setFavoritesToken(session.token)
              : void router.navigate({
                  to: "/login",
                  search: { redirect: location.href },
                })
          }
        >
          <Heart size={21} />
        </Button>
        <Link
          to="/"
          hash="catalogo"
          className="mobile-explore"
          aria-label="Explorar NFTs"
          title="Explorar NFTs"
        >
          <ScanLine size={28} />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Abrir carrinho com ${count} itens`}
          title="Carrinho"
          onClick={() => openCart(true)}
        >
          <ShoppingCart size={21} />
          {count > 0 && <span className="cart-count">{count}</span>}
        </Button>
        {session ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={session.user.name.split(" ")[0]}
            title="Minha conta"
            aria-expanded={menu}
            aria-controls="account-menu"
            onClick={() => setMenu(!menu)}
          >
            <UserRound size={21} />
          </Button>
        ) : (
          <Link
            to="/login"
            search={{ redirect: location.href }}
            data-login-trigger
            aria-label="Entrar"
            title="Entrar"
          >
            <UserRound size={21} />
          </Link>
        )}
      </nav>
      {session && favoritesToken === session.token && (
        <FavoritesPanel onClose={() => setFavoritesToken(null)} />
      )}
    </header>
  );
}
