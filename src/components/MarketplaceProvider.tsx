import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  bindSessionCache,
  restoreSession,
  useSession,
} from "@/services/session";
import { errorMessage } from "@/services/http";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "./ui/button";

const Context = createContext({
  cartOpen: false,
  openCart: (_open: boolean) => {},
  cartRevision: 0,
  filtersOpen: false,
  openFilters: (_open: boolean) => {},
  searchOpen: false,
  openSearch: (_open: boolean) => {},
  announce: (_message: string) => {},
});
export const useMarketplace = () => useContext(Context);
export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient(),
    router = useRouter(),
    { session } = useSession();
  const [cartOpen, openCart] = useState(false),
    [filtersOpen, openFilters] = useState(false),
    [searchOpen, openSearch] = useState(false),
    [cartRevision, setCartRevision] = useState(0),
    [message, announce] = useState(""),
    [failure, setFailure] = useState("");
  const changed = useCallback(() => {
    setCartRevision((value) => value + 1);
    announce(
      "Preco ou disponibilidade alterados. Revalide o carrinho antes de comprar.",
    );
  }, []);
  useSocket(changed);
  const restore = useCallback(() => {
    bindSessionCache(client);
    setFailure("");
    void restoreSession().catch((error) => setFailure(errorMessage(error)));
  }, [client]);
  useEffect(restore, [restore]);
  useEffect(() => {
    openCart(false);
    announce("");
  }, [session?.token]);
  useEffect(() => {
    const expired = () => {
      announce("Sua sessao expirou. Entre novamente para continuar.");
      void router.navigate({
        to: "/login",
        search: { redirect: router.state.location.href },
      });
    };
    window.addEventListener("kurio.session.expired", expired);
    return () => window.removeEventListener("kurio.session.expired", expired);
  }, [router]);
  return (
    <Context.Provider
      value={{
        cartOpen,
        openCart,
        cartRevision,
        announce,
        filtersOpen,
        openFilters,
        searchOpen,
        openSearch,
      }}
    >
      {failure && (
        <div role="alert" className="notice">
          {failure}{" "}
          <Button variant="outline" onClick={restore}>
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="announcement" role="status" aria-live="polite">
        {message}
        {message && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dispensar aviso"
            onClick={() => announce("")}
          >
            ×
          </Button>
        )}
      </div>
      {children}
    </Context.Provider>
  );
}
