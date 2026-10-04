import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { guestId, sessionState, useSession } from "@/services/session";
import { newest } from "@/services/query";
import type {
  Cart,
  CartItem,
  NFT,
  Network,
  NftSearch,
  Order,
  NftListResponse,
} from "@/types";

export function useScope() {
  const { session, ready } = useSession();
  return {
    session,
    ready,
    key: session
      ? ["private", session.token]
      : ["visitor", ready ? guestId() : "loading"],
  };
}
export function useNfts(search: NftSearch) {
  const { ready } = useSession();
  const client = useQueryClient();
  return useQuery({
    queryKey: ["nfts", search],
    enabled: ready,
    queryFn: async ({ signal }) => {
      const result = await api.nfts(search, signal);
      result.items = result.items.map((nft) =>
        newest(client.getQueryData<NFT>(["nft", nft.id]), nft),
      );
      return result;
    },
    structuralSharing: (old, next) => {
      const a = old as NftListResponse | undefined,
        b = next as NftListResponse;
      return {
        ...b,
        items: b.items.map((nft) =>
          newest(
            a?.items.find((item) => item.id === nft.id),
            nft,
          ),
        ),
      };
    },
  });
}
export function useNft(id: string) {
  const { ready } = useSession();
  return useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => api.nft(id, signal),
    enabled: ready && !!id,
    structuralSharing: (old, next) =>
      newest(old as NFT | undefined, next as NFT),
  });
}
export function useCart() {
  const scope = useScope();
  return useQuery({
    queryKey: [...scope.key, "cart"],
    queryFn: ({ signal }) => api.cart(signal),
    enabled: scope.ready,
  });
}
export function useCartAction() {
  const scope = useScope(),
    client = useQueryClient();
  return useMutation({
    mutationFn: (
      action:
        | { type: "add" | "change" | "remove"; item: CartItem }
        | { type: "coupon"; code: string | null },
    ) => {
      if (action.type === "coupon") return api.coupon(action.code);
      return action.type === "add"
        ? api.addItem(action.item)
        : action.type === "change"
          ? api.changeItem(action.item)
          : api.removeItem(action.item);
    },
    onSuccess: (cart: Cart) => {
      if (scope.session?.token !== sessionState().session?.token) return;
      client.setQueryData([...scope.key, "cart"], cart);
      void client.invalidateQueries({ queryKey: [...scope.key, "quote"] });
    },
  });
}
export function useQuote(network: Network) {
  const scope = useScope(),
    cart = useCart();
  return useQuery({
    queryKey: [...scope.key, "quote", network, cart.data?.version],
    queryFn: ({ signal }) => api.quote(network, signal),
    enabled: scope.ready && !!cart.data?.items.length,
    staleTime: 0,
    retry: false,
  });
}
export function useWallets() {
  const scope = useScope();
  return useQuery({
    queryKey: [...scope.key, "wallets"],
    queryFn: ({ signal }) => api.wallets(signal),
    enabled: scope.ready && !!scope.session,
  });
}
export function useOrder(id: string) {
  const scope = useScope();
  return useQuery({
    queryKey: [...scope.key, "order", id],
    queryFn: ({ signal }) => api.order(id, signal),
    enabled: scope.ready && !!scope.session && !!id,
    structuralSharing: (old, next) =>
      newest(old as Order | undefined, next as Order),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 2000 : false,
  });
}
